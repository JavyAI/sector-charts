import { useEffect, useState } from 'react';
import { Button } from '@tremor/react';

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
  } catch {
    // localStorage not available
  }
  return true; // default dark
}

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState<boolean>(getInitialDark);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('darkMode', String(isDark));
    } catch {
      // localStorage not available
    }
  }, [isDark]);

  return (
    <Button
      size="xs"
      variant="secondary"
      onClick={() => setIsDark((d) => !d)}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '☀ Light' : '🌙 Dark'}
    </Button>
  );
}
