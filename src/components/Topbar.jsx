export default function Topbar({ title, sub, branch, onBranch, showBranch = true }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-h">{title}</div>
        <div className="page-s">{sub}</div>
      </div>
      {showBranch && (
        <div className="br-wrap">
          <div className="br-toggle">
            {['EW', 'WE'].map(b => (
              <button
                key={b}
                className={`btab${branch === b ? ' active' : ''}`}
                onClick={() => onBranch(b)}
              >
                {b}
              </button>
            ))}
          </div>
          <div className="br-desc">
            T1 = <b>{branch === 'EW' ? 'Ethanol' : 'Water'}</b>
            {' · '}
            T2 = <b>{branch === 'EW' ? 'Water' : 'Ethanol'}</b>
          </div>
        </div>
      )}
    </div>
  )
}
