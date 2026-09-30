import re

# ── 1. Fix Sidebar: sticky + h-screen + overflow-y-auto on desktop ──
with open(r'apps\web\components\layout\Sidebar.tsx', 'r', encoding='utf-8') as f:
    sidebar = f.read()

# Fix the main wrapper: add sticky, h-screen, overflow-y-auto for desktop
sidebar = sidebar.replace(
    '"fixed top-0 left-0 bottom-0 z-[55] w-[85vw] max-w-xs flex flex-col shadow-2xl transition-transform duration-300 md:relative md:w-64 md:translate-x-0 md:shadow-none"',
    '"fixed top-0 left-0 bottom-0 z-[55] w-[85vw] max-w-xs flex flex-col shadow-2xl transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0 md:shadow-none md:w-64"'
)

with open(r'apps\web\components\layout\Sidebar.tsx', 'w', encoding='utf-8') as f:
    f.write(sidebar)
print("Sidebar.tsx done")

# ── 2. Fix HomeSportsSection: desktop layout wrapper height/overflow ──
with open(r'apps\web\components\sports\HomeSportsSection.tsx', 'r', encoding='utf-8') as f:
    hss = f.read()

# Outer wrapper: full viewport height on desktop for sticky to work
hss = hss.replace(
    'className="flex flex-col md:flex-row min-h-[calc(100vh-60px)]"',
    'className="flex flex-col md:flex-row min-h-screen"'
)

# Main content wrapper: allow scrolling on desktop
hss = hss.replace(
    '<div className="flex-1 w-full min-w-0">',
    '<div className="flex-1 w-full min-w-0 md:overflow-y-auto md:h-screen">'
)

with open(r'apps\web\components\sports\HomeSportsSection.tsx', 'w', encoding='utf-8') as f:
    f.write(hss)
print("HomeSportsSection.tsx done")

# ── 3. BottomNav: show quick-links on desktop inside sidebar-like desktop bar ──
# We'll add a desktop quick-access bar at the bottom of the sidebar section
# by updating BottomNav to also show a horizontal toolbar on desktop

with open(r'apps\web\components\layout\BottomNav.tsx', 'r', encoding='utf-8') as f:
    bn = f.read()

# Replace the closing fragment content - show desktop toolbar too
old_spacer = '      {/* Spacer so page content isn\'t hidden behind the bottom nav */}\n      <div className="md:hidden h-[58px]" />\n    </>'

new_spacer = '''      {/* Spacer so page content isn't hidden behind the bottom nav */}
      <div className="md:hidden h-[58px]" />

      {/* Desktop bottom toolbar — visible only on md+ */}
      <div className="hidden md:flex fixed bottom-0 left-0 w-64 z-40 border-t border-white/10 bg-[#051A0E]">
        <div className="grid grid-cols-4 w-full h-[54px]">
          <button onClick={() => window.location.href = '/'} className={`flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-semibold ${pathname === '/' ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>
            Sport
          </button>
          <button onClick={() => window.location.href = '/deposit'} className={`flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-semibold ${pathname === '/deposit' ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><circle cx="12" cy="15" r="1.5" fill="currentColor"/></svg>
            Deposit
          </button>
          <button onClick={() => window.location.href = '/check'} className={`flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-semibold ${pathname === '/check' ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'}`}>
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Check
          </button>
          <button onClick={() => window.location.href = '/betslip'} className={`flex flex-col items-center justify-center gap-1 transition-colors text-[10px] font-semibold relative ${pathname === '/betslip' ? 'text-[#19E66B]' : 'text-gray-400 hover:text-white'}`}>
            {betCount > 0 && <span className="absolute top-1 right-2 min-w-[15px] h-[15px] rounded-full flex items-center justify-center text-[8px] font-black bg-red-500 text-white">{betCount}</span>}
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>
            Betslip
          </button>
        </div>
      </div>
    </>'''

bn = bn.replace(old_spacer, new_spacer)

with open(r'apps\web\components\layout\BottomNav.tsx', 'w', encoding='utf-8') as f:
    f.write(bn)
print("BottomNav.tsx done")
