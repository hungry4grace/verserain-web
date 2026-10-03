import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Files written to the design system (UI/UX 第 4 階段). New pages go in
// src/pages/ and are checked automatically; `npm run lint:clean` must pass
// with zero problems on all of these.
export const CLEAN_FILES = [
  'src/ui/**/*.{js,jsx}',
  'src/pages/**/*.{js,jsx}',
  'src/TodayPage.jsx',
  'src/SettingsPage.jsx',
  'src/Onboarding.jsx',
  'src/ManualSearch.jsx',
  'src/YouTubeBgmField.jsx',
  'src/BottomNav.jsx',
  'src/navTabs.js',
  'src/modals/ShopPosterModal.jsx',
]

// Pages moved out of App.jsx as-is: they still carry the old hand-written
// colours and button styles. Take a file off this list once it has been
// converted to src/ui components and --color-* tokens.
export const LEGACY_FILES = [
  'src/pages/AboutPage.jsx',
  'src/pages/DonatePage.jsx',
  'src/pages/ManualPage.jsx',
  'src/pages/MapPage.jsx',
  'src/pages/SponsorPage.jsx',
  'src/pages/SponsorsPage.jsx',
  'src/pages/VerifyPage.jsx',
  'src/pages/GardenPage.jsx',
  'src/pages/LeaderboardPage.jsx',
  'src/pages/SearchPage.jsx',
  'src/pages/VerseSetsPage.jsx',
  'src/pages/CustomVersesPage.jsx',
  'src/pages/MultiplayerPage.jsx',
  'src/pages/AdvancedPage.jsx',
  'src/pages/DailyVersePage.jsx',
  'src/pages/BilingualRainPage.jsx',
  'src/pages/RewardsAdminPage.jsx',
  'src/pages/CharityPage.jsx',
  'src/pages/ContestsPage.jsx',
  'src/pages/MerchantPage.jsx',
  'src/game/VoicePlayScreen.jsx',
  'src/game/RainPlayScreen.jsx',
  'src/game/WaitingScreen.jsx',
  'src/game/MultiplayerResultsScreen.jsx',
  'src/game/IntermissionScreen.jsx',
  'src/game/GameOverScreen.jsx',
  'src/game/CampaignResultsScreen.jsx',
  'src/modals/VerseLeaderboardModal.jsx',
  'src/modals/ResetPasswordModal.jsx',
  'src/modals/LoginModal.jsx',
  'src/modals/PlayOrderModal.jsx',
  'src/modals/TranslateModal.jsx',
  'src/modals/PushModal.jsx',
  'src/modals/QrShareModal.jsx',
  'src/modals/VerseViewModal.jsx',
  'src/modals/VerseVoicePickerModal.jsx',
  'src/modals/VoiceCommentPanel.jsx',
  'src/modals/InboxPanel.jsx',
  'src/modals/FruitInfoModal.jsx',
  'src/modals/LevelInfoModal.jsx',
  'src/modals/PlayerGardenModal.jsx',
  'src/modals/AuthorSetsModal.jsx',
  'src/modals/SetLeaderboardModal.jsx',
]

const HEX = '/(^|[\\s(,:])#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\\b/'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // Design-system guard for new code: no hand-styled buttons, no hard-coded
    // colours. (ListRow's iconColor is the icon's accent colour and may be a
    // literal; src/ui's own Button/IconButton/ListRow render the <button>.)
    files: CLEAN_FILES,
    ignores: [...LEGACY_FILES, 'src/ui/Button.jsx', 'src/ui/IconButton.jsx', 'src/ui/ListRow.jsx'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "JSXOpeningElement[name.name='button'] > JSXAttribute[name.name='style']",
          message: 'Use <Button>/<IconButton> from src/ui (or a ui.css class) instead of an inline-styled <button>.',
        },
        {
          selector: `Literal[value=${HEX}]:not(JSXAttribute[name.name='iconColor'] > Literal)`,
          message: 'Use a var(--color-*) token from index.css instead of a hard-coded colour.',
        },
        {
          selector: `TemplateElement[value.raw=${HEX}]`,
          message: 'Use a var(--color-*) token from index.css instead of a hard-coded colour.',
        },
      ],
    },
  },
])
