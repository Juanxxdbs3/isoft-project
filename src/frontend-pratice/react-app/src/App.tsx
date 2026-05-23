import { use, useState } from "react";
import Card from "./components/Card";
import { CardBody } from "./components/Card";
import List from "./components/List";
import Button from "./components/Button";

function App() {
  const [data, setData] = useState(["Goku", "Tanjiro", "Superman", "Batman"]);
  // const list: string[] = ["Goku", "Tanjiro", "Superman", "Batman"];

  // const [isBtnLoading, setIsBtnLoading] = useState(false);

  // const handleBtnClick = () => {
  //   setIsBtnLoading(!isBtnLoading);
  //   console.log("Botón clickeado");
  // };

  // const handleSelect = (elemento: string) => {
  //   console.log("Seleccionaste a " + elemento);
  // };

  // const contenido = list.length ? (
  //   <List data={list} onSelect={handleSelect} />
  // ) : (
  //   "Sin elementos para mostrar"
  // );

  // return (
  //   <Card>
  //     <CardBody title="MiTarjeta" text="Se vienen cositas" />
  //     {contenido}
  //     <Button isLoading={isBtnLoading} onClick={handleBtnClick}>
  //       Hola Mundo
  //     </Button>
  //   </Card>
  // );

  const addMinion = () => setData([...data, "Minion"]);
  const delMinion = () => setData(data.slice(0, -1));
  return (
    <Card>
      <Button onClick={addMinion}>Agregar</Button>
      <Button onClick={delMinion}>Eliminar</Button>
      <List data={data} />
    </Card>
  );
}

export default App;
