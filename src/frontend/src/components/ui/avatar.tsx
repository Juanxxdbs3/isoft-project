import Image from "next/image";

const AVATAR_BASE = process.env.NEXT_PUBLIC_AVATAR_BASE_URL || "https://api.dicebear.com/10.x";
const STYLE = "open-peeps";

interface AvatarProps {
  seed: string;
  size?: number;
  className?: string;
  url?: string;
}

export function Avatar({ seed, size = 32, className = "", url }: AvatarProps) {
  const dicebearUrl = `${AVATAR_BASE}/${STYLE}/svg?seed=${encodeURIComponent(seed)}`;
  const finalUrl = url || dicebearUrl;

  return (
    <Image
      src={finalUrl}
      alt={`Avatar de ${seed}`}
      width={size}
      height={size}
      className={`rounded-full shrink-0 bg-surface ${className}`}
      unoptimized
    />
  );
}
