"use client";

import type { PromptInputMessage } from "@/components/ai-elements/prompt-input";
import type { FileUIPart, UIMessage, UIMessagePart } from "ai";

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { useChat } from "@ai-sdk/react";
import { useCallback, useMemo, useState } from "react";

type ChatProps = {
  getCanvasSnapshot?: () => Promise<string | null>;
};

const Chat = ({ getCanvasSnapshot }: ChatProps) => {
  const [text, setText] = useState<string>("");
  const { messages, sendMessage, status } = useChat();

  const addUserMessage = useCallback(
    async (content: string, attachments: FileUIPart[] = []) => {
      await sendMessage({
        text: content,
        files: attachments,
      });
    },
    [sendMessage],
  );

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const trimmedText = message.text.trim();
      const hasText = Boolean(trimmedText);

      if (!hasText) {
        return;
      }

      let snapshotUrl: string | null = null;
      if (getCanvasSnapshot) {
        try {
          snapshotUrl = await getCanvasSnapshot();
        } catch {
          snapshotUrl = null;
        }
      }
      const files: FileUIPart[] = snapshotUrl
        ? [
            ...message.files,
            {
              filename: `canvas-${Date.now()}.png`,
              mediaType: "image/png",
              type: "file",
              url: snapshotUrl,
            },
          ]
        : message.files;

      await addUserMessage(trimmedText, files);
      setText("");
    },
    [addUserMessage, getCanvasSnapshot],
  );

  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const isSubmitDisabled = useMemo(
    () => !text.trim() || status === "streaming",
    [text, status],
  );

  const getTextFromParts = useCallback((parts: UIMessagePart[]) => {
    return parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }, []);

  const getSourcesFromParts = useCallback((parts: UIMessagePart[]) => {
    return parts
      .filter((part) => part.type === "source-url")
      .map((part) => ({
        href: part.url,
        title: part.title ?? part.url,
        id: part.sourceId,
      }));
  }, []);

  const getReasoningFromParts = useCallback((parts: UIMessagePart[]) => {
    return parts
      .filter((part) => part.type === "reasoning")
      .map((part) => part.text)
      .join("\n");
  }, []);

  const getFileParts = useCallback((parts: UIMessagePart[]) => {
    return parts.filter((part): part is FileUIPart => part.type === "file");
  }, []);

  return (
    <div className="relative flex size-full flex-col divide-y overflow-hidden">
      <Conversation>
        <ConversationContent>
          {messages.map((message: UIMessage) => {
            const textContent = getTextFromParts(message.parts);
            const reasoning = getReasoningFromParts(message.parts);
            const sources = getSourcesFromParts(message.parts);
            const files = getFileParts(message.parts);

            return (
              <Message from={message.role} key={message.id}>
                <div>
                  {sources.length ? (
                    <Sources>
                      <SourcesTrigger count={sources.length} />
                      <SourcesContent>
                        {sources.map((source) => (
                          <Source
                            href={source.href}
                            key={source.id}
                            title={source.title}
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  ) : null}
                  {reasoning ? (
                    <Reasoning duration={0}>
                      <ReasoningTrigger />
                      <ReasoningContent>{reasoning}</ReasoningContent>
                    </Reasoning>
                  ) : null}
                  <MessageContent>
                    {textContent ? (
                      <MessageResponse>{textContent}</MessageResponse>
                    ) : null}
                    {files.length ? (
                      <Attachments className="mt-2" variant="inline">
                        {files.map((attachment, index) => {
                          const id = `${message.id}-${index}`;
                          return (
                            <Attachment data={{ ...attachment, id }} key={id}>
                              <AttachmentPreview />
                              <AttachmentInfo />
                            </Attachment>
                          );
                        })}
                      </Attachments>
                    ) : null}
                  </MessageContent>
                </div>
              </Message>
            );
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="grid shrink-0 gap-4 pt-4">
        <div className="w-full px-4 pb-4">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputHeader />
            <PromptInputBody>
              <PromptInputTextarea onChange={handleTextChange} value={text} />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputSubmit disabled={isSubmitDisabled} status={status} />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
};

export default Chat;
