import Card from "./components/Card";
import { CardBody } from "./components/Card";
import List from "./components/List";

function App() {
  const list = ["Goku", "Tanjiro", "Superman"];
  return (
    <Card>
      {" "}
      <CardBody title="MiTarjeta" text="Se vienen cositas" />
      <List data={list} />
    </Card>
  );
}

export default App;
