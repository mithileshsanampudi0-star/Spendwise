export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <span className="empty-state__icon">
          <Icon size={26} />
        </span>
      )}
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}
