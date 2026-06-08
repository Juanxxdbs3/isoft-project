"use client";

import { ChatWidget } from "../../../../components/chat/chat-widget";

export default function PsychologistChatPage() {
  return (
    <div className="h-[calc(100vh-6rem)]">
      <ChatWidget
        roomId="d1df7008-44fd-4fc3-b92c-82f4865a1d3c"
        currentUserId="584e5570-5b8c-4457-aad8-2920b3db270f"
        currentUserRole="psychologist"
      />
    </div>
  );
}
