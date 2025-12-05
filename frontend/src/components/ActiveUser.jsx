export default function ActiveUsers({ users = [] }) {
  return (
    <div className="active-users">
      <h4>Active Collaborators ({users.length})</h4>
      <div className="users-list">
        {users.length === 0 ? (
          <div className="no-users">No active collaborators</div>
        ) : (
          <ul>
            {users.map(u => (
              <li key={u.id} className="user-item">
                <div className="user-avatar">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-info">
                  <span className="user-name">{u.name}</span>
                  <small className="join-time">
                    Joined {new Date(u.joinedAt).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}