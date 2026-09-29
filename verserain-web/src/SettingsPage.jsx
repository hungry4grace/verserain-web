// SettingsPage — every setting in one place (UI/UX 第 2 階段), opened from
// 我的 → 設定 (#settings). The UI language and the Bible version are two
// separate choices here; the header's version button still switches both
// together as before.
import { Bell, Accessibility } from 'lucide-react';
import { Button, ListGroup, ListRow } from './ui';

// Each UI language in its own script, so people can find theirs.
const UI_LANG_LABELS = {
  zh: '繁體中文', cuvs: '简体中文', en: 'English', fa: 'فارسی', ar: 'العربية', he: 'עברית',
  ja: '日本語', ko: '한국어', es: 'Español', tr: 'Türkçe', de: 'Deutsch', my: 'မြန်မာ',
  vi: 'Tiếng Việt', id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', pt: 'Português', fr: 'Français',
  ru: 'Русский', hi: 'हिन्दी', km: 'ភាសាខ្មែរ',
};

const field = { display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' };
const selectStyle = {
  minHeight: 'var(--tap-min)', padding: '0 var(--space-3)', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)',
  fontSize: 'var(--fs-body)', fontFamily: 'var(--control-font-family)',
};
const hint = { color: 'var(--color-text-2)', fontSize: 'var(--fs-small)' };

function Field({ id, label, help, children }) {
  return (
    <div style={field}>
      <label htmlFor={id} style={{ fontWeight: 700 }}>{label}</label>
      {children}
      {help && <span style={hint}>{help}</span>}
    </div>
  );
}

export default function SettingsPage({
  t, uiLangs, uiLang, onUiLang,
  versions, version, onVersion,
  voiceOptions, voiceId, onVoice,
  pushOn, onPush,
  performanceMode, onPerformanceMode,
  onAccessible,
}) {
  return (
    <div data-testid="settings-page" style={{ maxWidth: 640, margin: '0 auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', color: 'var(--color-text)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--fs-display)' }}>{t('設定', 'Settings')}</h1>

      <ListGroup title={t('語言與經文', 'Language & Bible')}>
        <div style={{ ...field, borderTop: 'none' }}>
          <label htmlFor="set-ui-lang" style={{ fontWeight: 700 }}>{t('介面語言', 'App language')}</label>
          <select id="set-ui-lang" data-testid="settings-ui-lang" value={uiLang} onChange={(e) => onUiLang(e.target.value)} style={selectStyle}>
            {uiLangs.map((l) => <option key={l} value={l}>{UI_LANG_LABELS[l] || l}</option>)}
          </select>
          <span style={hint}>{t('按鈕和說明用的語言。', 'The language of buttons and help.')}</span>
        </div>
        <Field id="set-version" label={t('聖經譯本', 'Bible version')} help={t('經文、遊戲和朗讀用的譯本；改這裡不會改介面語言。', 'Used for verses, games and reading aloud. Changing it here keeps your app language.')}>
          <select id="set-version" data-testid="settings-version" value={version} onChange={(e) => onVersion(e.target.value)} style={selectStyle}>
            {versions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
      </ListGroup>

      <ListGroup title={t('聲音', 'Sound')}>
        <div style={{ ...field, borderTop: 'none' }}>
          <label htmlFor="set-voice" style={{ fontWeight: 700 }}>{t('朗讀語音', 'Reading voice')}</label>
          <select id="set-voice" data-testid="settings-voice" value={voiceId} onChange={(e) => onVoice(e.target.value)} style={selectStyle}>
            <option value="">{t('系統預設', 'System default')}</option>
            {voiceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <span style={hint}>{t('只影響目前的聖經譯本。', 'Applies to the current Bible version.')}</span>
        </div>
      </ListGroup>

      <ListGroup title={t('通知', 'Notifications')}>
        <ListRow
          testId="settings-push"
          icon={<Bell size={24} />}
          iconColor="#0ea5e9"
          title={pushOn ? t('已開啟每日經文推播', 'Daily Verse Push: On') : t('開啟每日經文推播', 'Daily Verse Push')}
          desc={t('每天上午 7 點手機推播今日經文', "Get today's verse pushed at 7am")}
          onClick={onPush}
        />
      </ListGroup>

      <ListGroup title={t('顯示與效能', 'Display & performance')}>
        <div style={{ ...field, borderTop: 'none', flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{t('省電模式', 'Battery saver')}</div>
            <div style={hint}>{t('減少背景動畫，手機比較不會發燙。', 'Fewer background animations, so the phone stays cooler.')}</div>
          </div>
          <Button
            variant={performanceMode ? 'primary' : 'secondary'}
            size="sm"
            role="switch"
            aria-checked={performanceMode}
            data-testid="settings-performance"
            onClick={() => onPerformanceMode(!performanceMode)}
          >
            {performanceMode ? t('開', 'On') : t('關', 'Off')}
          </Button>
        </div>
        <ListRow
          testId="settings-accessible"
          icon={<Accessibility size={24} />}
          iconColor="#475569"
          title={t('無障礙模式', 'Accessible mode')}
          desc={t('為視障朋友預備的簡化版，只靠聽和按鍵', 'A simplified version for blind and low-vision friends')}
          onClick={onAccessible}
        />
      </ListGroup>
    </div>
  );
}
