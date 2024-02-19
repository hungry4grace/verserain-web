from verserain.base.handler import BaseHandler
from verserain.login.auth import *
from verserain.email.models import *
from verserain.utils.text import *
from verserain import settings
from tornado.auth import FacebookGraphMixin
from tornado.web import asynchronous
from tornado.gen import coroutine

import re
import urllib

def get_handlers():
    return ((r"/login/logout/?", LogoutHandler),
            (r"/login/register/?", RegisterHandler),
            (r"/login/forgot_password/?", ForgotPasswordHandler),
            (r"/login/reset_password/?", ResetPasswordHandler),
            (r"/register/?", RegisterHandler),
            (r"/login/?", LoginHandler),
)

class ResetPasswordHandler(BaseHandler):
    @require_secure
    @require_login
    def get(self, error_message=None):
        self.render("login/reset_password.html",error_message=error_message,
                    selected_nav="login")

    @require_secure
    @require_login
    def post(self):
        password = self.get_argument("password")
        confirm_password = self.get_argument("confirm_password")
        error_message = None
        user = self.current_user

        if not confirm_password:
            error_message = "Password confirmation is required"
        elif not password:
            error_message = "Password is required."
        elif password != confirm_password:
            error_message = "Password does not match with confirmation"
        if error_message:
            return self.get(error_message=error_message)
        
        user.set_password(password)
        user.save()
        return self.redirect("/profile/account")

class ForgotPasswordHandler(BaseHandler):
    def get(self, error_message=None, feedback_message=None):
        self.render("login/forgot_password.html",error_message=error_message,
                    feedback_message=feedback_message,
                    selected_nav="login")

    def post(self):
        email = (self.get_argument("email") or "").strip()
        user = None
        error_message = None
        feedback_message = None

        if "@" not in email:
            username = email
            user = User.collection.find_one({"username":username})
        else:
            email = email.lower()
            user = User.collection.find_one({"email":email})
        
        if user is None:
            error_message = self.gt("User not found")
        elif user.email() is None:
            error_message = self.gt("No email was found for that user")
        else:
            feedback_message = self.gt("Email sent!")
            email = user['email']
            subject = "%s" % (self.gt("Reset Password"),)
            hash_code = user.reset_password_hash()
            verify_url = "https://%s/login/reset_password?h=%s&s=%s" % (settings.SITE_DOMAIN,
                                                                       hash_code, user.session_key())
            message, html = self.get_email_message("reset_password", verify_url=verify_url, user=user)

            EmailQueue.queue_mail(settings.ADMIN_EMAIL, email, subject, message, html=html)
            
        return self.get(error_message=error_message, feedback_message=feedback_message)

class RegisterHandler(BaseHandler):
    @require_secure
    def get(self):
        user = self.current_user
        error_message = None
        selected_nav = "register"
        self.render("login/register.html",user=user,error_message=error_message,
                    email="",username="",selected_nav=selected_nav)

    @require_secure
    def post(self):
        confirm_password = self.get_argument("confirm_password")
        password = self.get_argument("password")
        email = self.get_argument("email")
        username = (self.get_argument("username") or '').strip()
        error_message = None

        user = User.collection.find_one({'email':email})
        if user:
            error_message = "An account is already registered with that email."

        user = User.collection.find_one({'username':username})

        if len(username) < 4:
            error_message = "Username must be at least four characters."
        elif not is_valid_username(username):
            error_message = "Username contains invalid characters"
        elif user:
            error_message = "An account is already registered with that username."        
        elif not confirm_password:
            error_message = "Password confirmation is required"
        elif not password:
            error_message = "Password is required."
        elif password != confirm_password:
            error_message = "Password does not match with confirmation"
        elif not email:
            error_message = "Email is required."
        elif not username:
            error_message = "Username is required."
        elif (not is_valid_email(email)):
            error_message = "Invalid email"

        if error_message:
            self.render("login/register.html",user=None,error_message=error_message,
                        email=email,username=username, next_url=None)
            return

        user = create_new_user(username=username,email=email,password=password)
        session_key=user.session_key()
        self.set_secure_cookie("session_key",session_key)
        self.set_secure_cookie("email",email)
        self.current_user = user
        self.send_verify_email()
        self.redirectWithProtocol(uri="/profile/account",protocol="http")

class LoginHandler(BaseHandler):
    @require_secure
    def get(self):
        next_url = self.get_argument("next",None)
        user = self.current_user
        error_message = None
        email = self.get_secure_cookie("email")
        if email is None:
            email = ""
        selected_nav = "login"
        if next_url:
            self.set_cookie("next_url",urllib.quote(next_url.encode('utf-8')))
        self.render("login/login.html",user=user,error_message=error_message,email=email,
                    selected_nav=selected_nav, next_url=next_url)

    @require_secure
    def post(self):
        password = self.get_argument("password")
        login_subject = (self.get_argument("email") or '').strip()
        username = None
        email = login_subject
        login_subject_desc = "email"

        if "@" not in email:
            login_subject_desc = "username"
            username = login_subject
            email = None

        user = authenticate_login(email=email, username=username, password=password)
        error_message = None

        if user is None:
            user = User.collection.find_one({'username':username})
            error_message = "Invalid %s or password" % login_subject_desc       
            self.render("login/login.html",user=user,error_message=error_message,email=login_subject,username=username,
                        next_url=None)
            return

        session_key = user.session_key()
        self.set_secure_cookie("session_key",session_key)
        self.set_secure_cookie("email",login_subject)
        next_url = self.get_cookie("next_url")
        next_url = urllib.unquote(next_url) if next_url else "/"
        
        self.redirectWithProtocol(uri=next_url,protocol="http")
        self.clear_cookie("next_url")

class LogoutHandler(BaseHandler):
    def get(self):
        self.clear_cookie("session_key")
        self.clear_cookie("next_url")
        self.clear_cookie("language_code")

        self.redirect("/")

