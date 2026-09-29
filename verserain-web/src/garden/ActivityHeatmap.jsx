// Moved out of App.jsx unchanged (UI/UX 第 4 階段).
import { useEffect, useRef, useState } from 'react';

// --- Activity Heatmap Component ---
export const ActivityHeatmap = ({ t, activityMap = {} }) => {
  const [data, setData] = useState([]);
  const scrollRef = useRef(null);

  // Scroll to rightmost (current date) after data loads
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [data]);

  useEffect(() => {
    const historicalData = [];
    const today = new Date();
    // Generate 365 days of data from activityMap
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-CA');
      const val = activityMap[dateStr] || 0;
      historicalData.push({ date: d, value: val });
    }
    setData(historicalData);
  }, [activityMap]);

  const weeks = [];
  let currentWeek = [];
  data.forEach((day) => {
    // 0 = Sunday, 1 = Monday ... 6 = Saturday
    // Adjusting to start week on Monday
    const isMonday = day.date.getDay() === 1;
    if (isMonday && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Ensure first week is padded if it doesn't start on Monday
  if (weeks.length > 0 && weeks[0].length < 7) {
    const padCount = 7 - weeks[0].length;
    const pad = Array(padCount).fill(null);
    weeks[0] = [...pad, ...weeks[0]];
  }

  const getColor = (val) => {
    if (val === 0) return '#334155'; // Level 0: Empty (Dark gray)
    if (val < 200) return '#0e4429'; // Level 1: Opened the app/site
    if (val < 1000) return '#006d32'; // Level 2: Listened to verses
    if (val < 3000) return '#26a641'; // Level 3: Challenged new verses
    if (val >= 3000) return '#39d353'; // Level 4: High activity day
    return '#334155';
  };

  const getActivityTitle = (day) => {
    const value = day.value || 0;
    let label = 'No Activity';
    if (value >= 3000) label = 'High Activity';
    else if (value >= 1000) label = 'New Verse Challenge';
    else if (value >= 200) label = 'Listened to Verse';
    else if (value >= 100) label = 'Opened VerseRain';
    return `${day.date.toLocaleDateString()}: ${label}${value > 0 ? ` (${value} pts)` : ''}`;
  };

  const getMonthLabels = () => {
    const labels = [];
    let currentMonth = -1;
    weeks.forEach((week, index) => {
      const firstValidDay = week.find(d => d !== null);
      if (firstValidDay) {
        const month = firstValidDay.date.getMonth();
        if (month !== currentMonth) {
          labels.push({ text: firstValidDay.date.toLocaleString('en-US', { month: 'short' }), index });
          currentMonth = month;
        }
      }
    });
    return labels;
  };

  const monthLabels = getMonthLabels();

  return (
    <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', color: '#cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#f8fafc', fontSize: '1rem', fontWeight: 'bold' }}>{t("活動", "Activity")}</h3>
      <div ref={scrollRef} style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ position: 'relative', height: '15px', marginBottom: '4px' }}>
          {monthLabels.map((lbl, i) => (
            <span key={i} style={{ position: 'absolute', left: `${(lbl.index * 16) + 30}px`, fontSize: '0.75rem', color: '#94a3b8' }}>
              {lbl.text}
            </span>
          ))}
        </div>
        <div style={{ display: 'inline-flex', gap: '4px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8', paddingRight: '8px', height: '108px', paddingTop: '4px' }}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
            <span>Sun</span>
          </div>
          {weeks.map((week, wIdx) => (
            <div key={wIdx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {week.map((day, dIdx) => {
                if (!day) return <div key={dIdx} style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'transparent' }} />;
                return (
                  <div 
                    key={dIdx} 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '2px', 
                      background: getColor(day.value) 
                    }} 
                    title={getActivityTitle(day)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.8rem' }}>
        <span style={{ cursor: 'pointer' }}>What is this?</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>Less</span>
          <div style={{ width: '12px', height: '12px', background: '#334155', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#0e4429', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#006d32', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#26a641', borderRadius: '2px' }} />
          <div style={{ width: '12px', height: '12px', background: '#39d353', borderRadius: '2px' }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
};
