interface NoteProps {
  note: string;
  onChange: (note: string) => void;
}

export function Note({ note, onChange }: NoteProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);

    // 自動調整高度
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // 聚焦時確保高度適應內容
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex flex-col space-y-2">
        <span className="text-gray-600 pl-2">備註</span>
        <div className="w-full">
          <textarea
            value={note}
            onChange={handleChange}
            onFocus={handleFocus}
            className="w-full px-3 py-2 rounded-lg focus:outline-none border border-gray-300 text-gray-800 resize-none overflow-hidden"
            style={{
              height: "38px", // 初始高度設為一行
              minHeight: "38px", // 最小高度為一行
            }}
            placeholder="輸入備註"
            rows={1}
          />
        </div>
      </div>
    </div>
  );
}
