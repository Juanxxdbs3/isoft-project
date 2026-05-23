import { useState } from "react";

type Props = {
  data: string[];
  onSelect?: (elemento: string) => void;
};

function List({ data, onSelect }: Props) {
  const [index, setIndex] = useState(-1);
  function handleClick(i: number, elemento: string) {
    setIndex(i);
    onSelect?.(elemento);
  }
  return (
    <ul className="list-group">
      {data.map((elemento, i) => (
        <li
          key={elemento}
          className={`list-group-item ${index == i ? "active" : ""}`}
          onClick={() => handleClick(i, elemento)}
        >
          {elemento}
        </li>
      ))}
    </ul>
  );
}

export default List;
