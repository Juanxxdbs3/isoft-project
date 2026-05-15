import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
}

interface CardBodyProps {
  title: string;
  text?: string;
}

function Card(props: CardProps) {
  const { children } = props;

  return (
    <div
      className="card"
      style={{
        width: "350px",
      }}
    >
      <div className="card-body">{children}</div>
    </div>
  );
}

export function CardBody(props: CardBodyProps) {
  const { title, text } = props;

  return (
    <>
      <h5 className="card-title">{title}</h5>
      <p className="card-text">{text}</p>
      <a href="#" className="btn btn-primary">
        Go somewhere
      </a>
    </>
  );
}

export default Card;
