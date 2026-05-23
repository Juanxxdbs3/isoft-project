import { type ReactNode } from "react";
import "./Button.css";

interface ButtonProps {
  children: ReactNode;
  isLoading?: boolean;
  onClick: () => void;
}

function Button(props: ButtonProps) {
  const { children, isLoading, onClick } = props;
  return (
    <button
      type="button"
      className={`btn btn-${isLoading ? "secondary" : "primary"}`}
      onClick={onClick}
      disabled={isLoading}
    >
      {isLoading ? "Cargando..." : children}
    </button>
  );
}

export default Button;
