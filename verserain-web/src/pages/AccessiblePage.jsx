// The accessible (blind-mode) home — moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { AccessibleBlindHome } from '../AccessibleBlindHome.jsx';

export default function AccessiblePage({ t, currentSet, randomPickCount, readAccessibleGuide, safeActiveSets, setRandomPickCount, setSelectedSetId, startAccessibleBlindGame }) {
  return (
    <AccessibleBlindHome
      verseSets={safeActiveSets}
      currentSet={currentSet}
      randomPickCount={randomPickCount}
      setRandomPickCount={setRandomPickCount}
      onSelectSet={(setId) => setSelectedSetId(setId)}
      onStart={startAccessibleBlindGame}
      onReadGuide={readAccessibleGuide}
      t={t}
    />
  );
}
