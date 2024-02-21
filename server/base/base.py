from verserain.base.handler import BaseHandler
from verserain.login.auth import *
from verserain.verse.models import *
from verserain.email.models import *
from verserain import settings

def get_handlers():
    return ((r"/?", FrontPageHandler),
            (r"/privacy/?", PrivacyPageHandler),
            (r"/search/?", SearchPageHandler),
            (r"/contact/submit/?", ContactHandler),
            (r"/contact/?", ContactPageHandler),
    )

class PrivacyPageHandler(BaseHandler):
    def get(self):
        language_code = self.language_code()
        self.redirect("/page/privacy/%s" % language_code)

class FrontPageHandler(BaseHandler):
    def get(self, path=None):
        self.redirect("/versesets")
        
class SearchPageHandler(BaseHandler):
    def get(self):
        self.render("search.html", selected_nav="search")

class ContactPageHandler(BaseHandler):
    @require_login
    def get(self):
        message_sent = self.get_boolean_argument("message_sent",False)
        self.render("contact.html", selected_nav="about", message_sent=message_sent)

class ContactHandler(BaseHandler):
    @require_login
    def post(self):
        import smtplib
        from_email = "admin@%s" % settings.MAIL_DOMAIN
        reply_to_email = self.get_argument("email")
        to_email = ["help@%s" % settings.MAIL_DOMAIN] # must be a list
        subject = self.get_argument('subject', '')
        body = self.get_argument('message', '')
        num_words = len(body.split())
        if num_words >= 5:
            message = self.get_argument('message', '')
            message += "\n\nemail: %s" % (self.current_user.get('email') or '')
            message += "\nuser info: %s" % self.current_user
            EmailQueue.queue_mail(from_email,to_email,subject,message,reply_to=reply_to_email)

        self.redirect("/contact?message_sent=True")
