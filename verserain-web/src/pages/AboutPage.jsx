// The 'about' page — moved out of App.jsx unchanged (UI/UX 第 4 階段).

export default function AboutPage({ t }) {
  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#334155', lineHeight: '1.6' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', fontFamily: 'var(--app-font-family)', color: '#3b82f6' }}>
        {t('Verse Rain 讓背記經文變得生動有趣！', 'VerseRain makes scripture memorization fun!')}
      </h2>

      <p style={{ marginBottom: '1rem' }}>
        {t('一間華人教會使用 VerseRain 應用程式為會眾舉辦了「聖經背誦比賽」。家庭和小組中的所有年齡層都能參與。他們架設了四台投影機，讓四個隊伍能同時在相同的經文組上進行挑戰模式的比賽。', 'A Chinese church used the VerseRain app to host a "Bible Memorization Contest" for its congregation. All ages in families and small groups participated. They set up four projectors, allowing four teams to compete simultaneously in Challenge Mode using the same verse sets.')}
      </p>
      <iframe width="560" height="315" src="//www.youtube.com/embed/2tFxeesKISk" frameBorder="0" allowFullScreen=""></iframe>

      <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        {t('一位四歲的男孩和三歲的妹妹急切地想展示他們能用中文背誦「主禱文」來遊玩 VerseRain。他們都是在美國出生的，卻能夠用中文閱讀並遊玩這款遊戲。', 'A four-year-old boy and his three-year-old sister eagerly showed off how they could recite the "Lord\'s Prayer" in Chinese by playing VerseRain. Born in the US, they are able to read Chinese and play this game.')}
      </p>
      <iframe width="560" height="315" src="//www.youtube.com/embed/Tty82Gn1gvQ" frameBorder="0" allowFullScreen=""></iframe>

      <p style={{ marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        {t('聖經經文的單字會從天而降，玩家只要按照正確的順序點擊經文就能獲得分數。經文被點擊時，會用語音朗讀出來，從視覺和語音的聽覺兩方面來加強您的記憶。', 'Words of bible verses fall from the sky, and you score points by clicking the verse in the correct order. The verse is spoken out loud when clicked to reinforce your memory audibly and spelling visually.')}
      </p>

      <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>{t('學習多種語言的聖經經文！', 'Learn bible verses in multiple languages!')}</li>
        <li>{t('點擊單字時會有文字轉語音的朗讀功能，來加深您對經文背誦的印象。', 'Text to Speech verbal reading as you click the words to impress your memory on verse recitation.')}</li>
        <li>{t('透過 verserain，能支援近乎無限多的經文、經文組以及多種聖經譯本可以使用。', 'Through verserain, it supports virtually unlimited number of verses, verse sets, and multiple bible versions.')}</li>
        <li>{t('提供多種挑戰難度，無論是小孩還是成人都非常適合來挑戰自己的極限。', 'Multiple difficulty levels offered to be played by kids to adults.')}</li>
        <li>{t('挑戰模式有助於加強記憶同一個經文組中的多段相關經文。', 'Challenge mode helps to strengthen the memory of multiple related verses in the same verse set.')}</li>
        <li>{t('線上排行榜能激勵會眾、青年團契和小組成員一起參與遊玩、共同精進！', 'Online Leaderboard to motivate congregation, youth fellowships and small group members to participate and improve together!')}</li>
        <li><span dangerouslySetInnerHTML={{ __html: t("<strong>全新語音模式：</strong> 結合最先進的拼音模糊辨識技術，您可以直接開口背誦！即使發音不夠標準也能智慧通關，用語音大聲宣告神的話語，還能獲得額外的 50% 分數加成。", "<strong>New Voice Mode:</strong> Combining state-of-the-art fuzzy pinyin recognition, you can recite directly with your voice! Even with non-standard pronunciation, you can intelligently pass the level. Proclaim God's word loudly and gain an extra 50% score bonus.") }} /></li>
        <li><span dangerouslySetInnerHTML={{ __html: t("<strong>多人即時連線對戰：</strong> 支援創建專屬房間，讓全家大小或小組成員在各自的手機上，同步挑戰同一組經文，享受刺激的即時競技樂趣！", "<strong>Multiplayer Real-time Battle:</strong> Support creating private rooms, allowing family or group members to simultaneously challenge the same verses on their phones, enjoying the thrill of real-time competition!") }} /></li>
      </ul>

    </div>
  );
}
