import { ReactNode } from "react";
import Link from "next/link";
import { Text } from "@chakra-ui/react";

export const renderMentions = (content: string): ReactNode => {
  const parts = content.split(/(@[a-zA-Z0-9._]+)/g);
  return parts.map((part, i) => {
    if (/^@[a-zA-Z0-9._]+$/.test(part)) {
      const username = part.slice(1);
      return (
        <Link key={i} href={`/profile/${username}`}>
          <Text
            as="span"
            fontWeight="bold"
            color="blue.500"
            _hover={{ textDecoration: "underline" }}
          >
            {part}
          </Text>
        </Link>
      );
    }
    return <span key={i}>{part}</span>;
  });
};
