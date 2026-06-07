import Image from "next/image";

const AVATAR_BASE = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || "https://api.dicebear.com/10.x";
const STYLE = "open-peeps";

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
}

export function Avatar({ seed, size = 32, className = "" }: AvatarProps) {
  const url = `${AVATAR_BASE}/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;

  return (
    <Image
      src={url}
      alt={`Avatar de ${seed}`}
      width={size}
      height={size}
      className={`rounded-full shrink-0 bg-surface ${className}`}
      unoptimized
    />
  );
}
