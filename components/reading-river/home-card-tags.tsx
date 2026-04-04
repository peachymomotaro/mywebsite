"use client";

import { useState } from "react";

const MAX_INLINE_TAG_TEXT_LENGTH = 28;
const MAX_INLINE_TAG_COUNT = 2;

type HomeCardTagsProps = {
  tags: string[];
};

function shouldCollapseTags(tags: string[]) {
  return tags.length > MAX_INLINE_TAG_COUNT || tags.join(", ").length > MAX_INLINE_TAG_TEXT_LENGTH;
}

export function HomeCardTags({ tags }: HomeCardTagsProps) {
  const [expanded, setExpanded] = useState(false);

  if (tags.length === 0) {
    return null;
  }

  const tagText = tags.join(", ");

  if (!expanded && shouldCollapseTags(tags)) {
    return (
      <button
        type="button"
        className="river-spotlight-tags-toggle"
        onClick={() => setExpanded(true)}
      >
        View {tags.length} tags
      </button>
    );
  }

  return (
    <p className="river-spotlight-tags" title={tagText}>
      {tagText}
    </p>
  );
}
