import { useState, useEffect } from 'react';

function Settings() {
  const [tabs, setTabs] = useState([]);

  useEffect(() => {
    window.electronAPI.onUpdateTabs((updatedTabs) => {
      setTabs(updatedTabs);
    });
  }, []);

  const getTimeTabActive = (lastActive) => {
    if (!lastActive) return -1;

    const now = Date.now();
    const dur = now - lastActive;
    const s = Math.floor(dur / 1000);
    const m = Math.floor(s / 60);

    return m;
  };

  const handleHibernate = (index) => {
    window.electronAPI.hibernateTab(index);
  };

  return (
    <div className="overflow-hidden m-0 p-0 bg-slate-950 w-full h-screen">
      <div className="w-full h-full p-6">
        <div className="text-2xl font-bold text-white mb-6">Settings</div>

        <div className="rounded-lg p-4">
          <div className="text-lg font-semibold text-white mb-4 border-b border-slate-600">
            Manually Hibernate Tabs
          </div>

          <div className="space-y-2">
            {tabs.length < 2 ? (
              <div className="text-slate-400">Must have at least 2 tabs open</div>
            ) : (
              tabs.map((tab, index) => (
                <div key={index} className="flex flex-row items-center justify-between">
                  <div className="flex flex-row gap-2">
                    <div className="text-white font-light text-sm min-h-full flex items-center justify-center border-r border-slate-600 max-w-10 min-w-10 py-2">
                      {index}
                    </div>

                    <div className="text-white font-medium min-h-full flex items-center justify-center">
                      {tab.title || "New Tab"}
                    </div>

                    <div className={`text-sm min-h-full ${tab.isActive ? "text-slate-100" : "text-slate-500"} flex items-center justify-center`}>
                      {tab.isActive ? "Active" : "Hibernated"}
                    </div>

                    <div className="text-xs text-slate-400 min-h-full flex items-center justify-center">
                      {getTimeTabActive(tab.lastActiveAt)}
                    </div>
                  </div>

                  <button
                    className={`rounded-md text-sm font-light ${tab.isActive ? "bg-red-700/40" : "bg-slate-700/40"} transition-all duration-100 px-4 py-1 text-white`}
                    disabled={!tab.isActive}
                    onClick={() => handleHibernate(index)}
                  >
                    {tab.isActive ? "Hibernate" : "Hibernated"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;