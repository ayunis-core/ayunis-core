import './new-chat-backdrop.css';

export default function NewChatBackdrop() {
  return (
    <div className="new-chat-backdrop" aria-hidden>
      <div className="new-chat-backdrop__canvas">
        <div className="new-chat-backdrop__blobs">
          <div className="new-chat-backdrop__blob is-1" />
          <div className="new-chat-backdrop__blob is-2" />
          <div className="new-chat-backdrop__blob is-3" />
        </div>
      </div>
    </div>
  );
}
