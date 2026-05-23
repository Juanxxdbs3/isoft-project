

## 1. ¿Qué es React?

React es una *biblioteca* agnóstica para la creación de interfaces de usuario de aplicaciones en diferentes plataformas, coloquialmente conocemos a React en conjunto con ReactDOM como un framework.

El `framework` busca ayudar  los desarrolladores a controlar y desarrollar interfaces a través de lo que conocemos como `componentes` los cuales son pequeños fragmentos de código reutilizables y que representan partes de la *GUI* (Graphical User Interface).

React como framework, lo que hace por detrás es manejar el DOM de manera automática y renderizar, de modo que los desarrolladores no tengan que preocuparse en pintar la interfaz ni cambiar pieza por pieza de la página con `document.getElementById();` si no que lo hacen por bloques (Componentes) que tienen estructuras definidas a través de lo que es la combinación de xml con javascript resultando en JSX o typescript resultando en TSX. 

Por ejemplo

```tsx
const usuario: String = 'Alex';

function App (){
	retun <p>Hola {usuario}</p>;
}

```
Es un código que parece html y ts, pero en realidad es xml y ts, lo cual resulta en TSX. Este código compilado por Babel o parcel a javascript, resulta en:

```
const usuario = 'Alex';
const paragraph = React.createElement("p", null, ´Hola ${usuario}´);
```

### 1.1 Componentes

Un componente es un módulo que expone una parte reutilizable de la interfaz de usuario, puede ser un header, un footer, una sección, una tarjeta y en general, cualquier conjunto de etiquetas html, sin embargo, como en React no trabajamos en html, algunas cosas cambian al dar propiedades o usar dichos componentes, veamos un ejemplo:

Esto es una tarjeta extraída del sitio de Bootstrap, podemos notar que en lugar de `class` usamos `className` porque TS tiene `class` reservada y para el `style` necesitamos pasarle un objeto que defina las propiedades de ese estilo
```tsx
function Card(){

const width = {
	width: 350px
}

	return (
		<div className="card" style={width}>
			<div className="card-body">
				<h5 className="card-title">Card title</h5>
				<p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
				<a href="#" className="btn btn-primary">Go somewhere</a>

			</div>
		</div>
	)
}

export default Card;
```

Para usarlo en el App, lo importamos como un módulo normal, pero lo usamos como si fuera una etiqueta de esta forma `<Component/>` es importante el PascalCase
```tsx
import Card from "./components/Card"

function App() {
	return(
		<Card/>
	);
}

export default App;
```

### 1.3 Fragments

El componente que se ha creado sirve para ejemplificar el propósito del mismo y cómo usarlo, sin emabargo la filosofía de react es manejar partes reutilizables incluso si son de los componentes, esto implica que a pesar de que un componente tenga partes que son propias de él mismo, están puedan ser mutadas o alteradas de modo que no haya que cambiar el componente completo en ajustes si no esa pequeña parte del mismo que definiremos como `fragment`

Un fragmento entonces es una parte de un componente. Entonces un componente lo que tiene es una estructura formada por fragmentos, digáse header, body, footer, secciones, etc. Un fragmento en realidad solo es un contendor invisible que sirve para agrupar varios elementos hermanos sin meter un nodo extra en el DOM.

En el ejemplo anterior, el componente se hace verboso si se coloca todo en el mismo componente o función, así que podemos separarlo para tener su body como un fragmento, para ello debemos importar el objeto `fragment` desde React

```tsx

import {Fragment} from 'react';

function Card(){

const width = {
	width: 350px
}

	return (
		<div className="card" style={width}>
			<div className="card-body">
			<CardBody/>
			</div>
		</div>
	)
}

export function CardBody() {
	return (
		<Fragment>
		...
		</Fragment>
	);
}
```

En React es importante que los componentes vayan con la convención de PascalCase, porque sino al utilizarlo y no está nombrado así, dará un error, además, es posible omitir la importación de `{Fragment}` y solo usar `<> </>`  de modo que se omite tanto la importación y ya JSX sabe que es un fragmento.

```tsx
export function CardBody() {
	return (
		<>
		...
		</>
	);
}
```

### 1.3 Propiedades o props

Cuando utilizamos fragmentos como lo hemos venido haciendo hasta ahora el contenido de los mismos es estático y solo se puede cambiar alterando directamente el fragmento, pero si quisieramos hacer que el contenido de los mismos fuera dinámico podemos parametrizar lo que muestran a través del paso de paraemetros como objetos.

Para definir que una función recibirá parámetros simplemente lo hacemos como si recibiera una variable

```tsx
export function CardBody(props: CardBodyProps){
	const {title, text} = props
	...
	<h5 className="card-title">{title}</h5>
	<p className="card-text">{text}</p>
	...
}
```
Y los usamos asignando valor a las propiedades que respondan al tipo que el componente espera.
```
<CardBody title="MiTarjeta" text="Se vienen cositas" />
```
Los parámetros que recibe un componente se definen en su contrato a través de la interfaz, el ? indica que es una propiedad opcional, por defecto son obligatorias.

```tsx
interface CardBodyProps {
	title: string;
	text?: string;
}
```

### 1.5 Children

Si quisiéramos pasar además de propiedades otro componente a un componente, necesitamos usar una propiedad especial de React llamada `children`. Esta propiedad permite pasar contenido anidado a un componente, incluyendo uno o varios componentes hijos.

Para usarlo, definimos en la interfaz del componente la prop `children` con el tipo `ReactNode`, que es el tipo recomendado para representar todo lo que React puede renderizar dentro de esa propiedad.

```tsx
import type { ReactNode } from "react";

interface CardProps {
  title: string;
  children: ReactNode;
}

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}

export default Card;
```

### 1.6 Listas y pasar listas 
Cuando queremos utilizar las listas existen varias formas de definir un componente de react y que este reciba los datos que necesita procesar como parametros que vienen desde el main. Podemos aprovechar la función map para procesar la lista de datos que viene. Cuando usamos listas debemos colocarle los ids únicos para que no muestren error.

### 1.7 Gestión de eventos
Básicamente es gestionar las propiedades que manejan disparadores, por ejemplo onClick (sí con mayúsculas). React utiliza sus propios tipos de eventos para manejarlos, un truco para ver cuál es el evento de react equivalente, es manejarlo justo en el elemento jsx sobre el cual se irá gestionando:

```tsx
<h1 onClick = (e) => console.log(e)> </h1>
```
Gracias a esa propiedad de react que maneja los eventos nos ahorramos tener que gestionar el tipo de evento para cada navegador.


### 1.8 Gestión de estado
Básicamente esta sección lo que quiere decir es que React tiene un scope local por sus componentes, por lo que un componente no conoce o no puede alterar los atributos de otro componente, lo que significa que cuando esa es la intención, debemos manejar métodos que nos proporciona react, como por ejemplo, para hacer un hover.  además de que cada vez que renderiza reinicia, por lo que los valores al final no son "static".

Para ello importamos ```useState``` que recibe como parámetro el  elemento que seleccione por defecto, devuelve un array con dos valores: El primero es la variable que podemos alterar y el segundo es una función por definición que  nos permite alterar el primer valor del array, ```setVariable``` 
```
[index, setIndex] = useState(1 // )
```
Esto en palabras simples lo que hace es un "hook" al elemento que queremos dinámico para poder cambiarle el estado en tiempo de ejecución y que lo conserve al renderizar. Además, permite manejar estados independientes por componentes.
La cuestión es que hay que saber dónde colocarlo, porque React renderiza todo el componente bajo esa función, lo que podría afectar a nuestro rendimiento si se usa mal o de manera global, hay que usarlo en el componente que sepamos que será dinámico.


### 1.9 Funciones como props

Básicamente resuelven el problema de ejecutar operaciones al seleccionar componentes dentro de otros componentes y además conservar sus valores en el componente padre.

Normalmente entonces, el componente recibirá como parametro la función por definición, incluso como un callback supongo.
Ahora, en typescript debemos dejar definido en el interface o props el prototipo de función o la definición de la misma, como en C++.

Esto es similar al polimorfismo, es pasarle funciones desde más arriba a componentes de menor jerarquia y definir sus comportamientos de manera independiente incluso si son el mismo tipo de componente.


### 1.10 State vs Props
State son los datos/atributos internos del componente, mientras que las props son simplemente parametros que reciben los componentes, además las props no tienen como objetivo mutar, mientras que las state sí. Sin embargo, cuando alguno cambia, el componente se renderiza nuevamente.


### 1.11 Truthy & Falsy

falsy = [0, undefined, null, "", false] al menos en JS, pero en React esto no sucede de la misma manera.

Esto lo que quiere decir es que al hacer una evaluación de true or false en react, normalmente queremos hacer una acción al tener true, pero si lo hacemos dentro de un componente, React va a imprimir el resultado del falso, por ejemplo

```tsx
const miLista: string [] = [];
function miComponente(){
	return (
	<h1> 
		{miLista.length() && "miLista}
	</ h1>
	)

}
```
Eso imprimiria 0, a pesar de que la intención es imprimir lista en caso de que la haya. La forma correcta de evaluar eso es con 

```{miLista.length() !== 0 && "miLista}```


### 1.11 Renderizado condicional

Básicamente es saber utilizar el short circuit operator o el nullish coaleshing, aunque nunca falla el confiable if.

La idea es siempre evaluar un true o false del lado izquierdo, ya que react sí renderiza los números o cadenas vacías, lo único que no renderiza son los booleanos.


### 1.12. Estilo, organización  y consideraciones al usar React

Existen varias formas de agregar estilos
- Inline Style: no soporta animaciones ni funciones avanzadas de css.
- Archivos css: importarlos a los componentes donde se quieren usar.
- Módulos de CSS: archivo.modulo.css, se importa a una variable  `import variable from "archivo.module.css"` y usar en el  className la `variable`. en los archivos css se deben usar . para definir el estilo de una clase porque si no se agregan global, luego para cada estilo, simplemente usamos un objeto  style en forma de array en el className del componente al que se desea dar estilo.
- CSS en JS, basicamente es usar type/styled-components, se instala con npm.

En todo caso, en css normalmente se separan los nombres con un guión (snake-case), en React debemos declararlos con pascal case, cada palabra comienza con mayúscula. 

Normalmente en los proyectos de React se utiliza la estructura MVC (styles, components, reducers) y la estructura por funcionalidades. MVC suele funcionar mejor para proyectos pequeños, mientras que por funcionalidades suele funcionar mejor para proyectos grandes.

Algunas bibliotecas populasres
son Tailwind, Bootstrap, BulmaCSS, Daisy UI, Chakra UI, React Bulma.

En general los frameworks de css son componentes construidos sobre bibliotecas de clases predefinidas.







>[!Preguntas] Preguntas sobre React
> - [ ] **¿Qué diferencia hay entre un fragmento y un componente?**
>   _Un componente es una unidad reutilizable de UI con lógica y apariencia. Un fragmento es solo un contenedor invisible para agrupar varios elementos dentro de un componente sin crear un nodo extra en el DOM. En corto: el componente es la pieza; el fragmento es el envoltorio invisible._
>
> - [ ] **¿Por qué prettier agrega {...}{...} al colocar un componente?**
>   _Lo más probable es que no sea Prettier “inventando cosas”, sino JSX expresando JavaScript. Las llaves `{}` abren una expresión JS dentro de JSX, y `...` puede ser el operador spread para expandir props u objetos. Prettier solo reordena y formatea; no cambia el significado._
>
> - [ ] **¿Solamente puedo pasar un componente por cada children definido o con un solo children pueden ir varios componentes?**
>   _Un solo `children` puede contener varios componentes. `children` puede ser una colección completa de nodos React, no solo uno._
>
> - [ ] **¿Cómo sé cuál es el scope o el componente que va a volver a renderizar useState?**
>   _El componente que contiene ese estado es el que React vuelve a renderizar cuando llamas al setter. Si ese componente pasa props a hijos, esos hijos también se reevaluarán según cómo esté estructurada la UI. La idea base es: el estado vive dentro del componente y el setter dispara el nuevo render._
>
> - [ ] **¿Por qué se coloca el punto en funciones opcionales que se ejecutan solo cuando están definidas? funcion?.();? ¿Para qué sirve ese punto, no es suficiente con el "?" ?**
>   _Eso es el operador de encadenamiento opcional `?.`. Sirve para llamar una función solo si existe; si `func` es `undefined` o `null`, la expresión devuelve `undefined` en vez de lanzar error. El `?` solo no hace eso; el operador completo es `?.`._
>
> - [ ] **En jsx/tsx al escribir una string en `` no se utiliza $ para poner las variables?**
>   _Sí se usa, pero dentro de la plantilla de JavaScript. En JSX escribes una expresión entre `{}` y dentro de esa expresión puedes usar una template literal con backticks y `${variable}`. Si solo quieres mostrar una variable, también puedes usar `{usuario}` sin backticks._
>
> - [ ] **Si queremos pasar más de un componente a otro componente como prop, debemos definir varios children en su interfaz o solo uno basta?**
>   _Solo uno basta. `children` está pensado para recibir múltiples nodos React, así que puede contener varios componentes a la vez. Si necesitas una API más específica que `children`, entonces sí puedes crear props adicionales, pero no por obligación._


## 2. NextJS

### 2.1 ¿Qué es NextJS y para qué sirve?

NextJS es un framework de un framework xd.
Miento. 
NextJS es un framework construído sobre las bibliotecas de React cuyo objetivo es permitir a los desarrolladores construir aplicaciones web fullstack. Para el frontend se utiliza React, pero NextJS añade ciertas características como un router, optimizaciones y un aspecto muy importante que es el renderizado del lado del servidor, esto lo hace con la ayuda de NodeJS. Se enfoca en la construcción rápida de aplicaciones basadas en React.

Iré anotando aquí lo que es más relevante para construir el proyecto.

### 2.2 App Router y Pages Router

Entiendo un router como una mini aplicación que vive dentro de una más grande, la cual se encarga de redireccionar las peticiones que lleguen a la misma al endpoint correspondiente y aplicar middlewares antes de que estas pasen al controlador (lógica del endpoint). 
Digamos que en un router "normal" como el de Express, uno puede indicar dónde se encuentra el controlador a través de una importación, pues se usa simplemente la función importada. 
Al parecer en NextJS lo que se hace es que se tienen dos routers: Uno viejo (pages Router) y el nuevo (App Router) que se distinguen en que el nuevo utiliza las características más nuevas de React, y a diferencia de un router normal, estos encuentran los controladores basados en un sistema de archivos, es decir, a través de carpetas. Por otro lado, hasta ahora no veo diferencias, pero creo que es el mismo concepto.

Ok, chatgpt dice que no es como una aplicación si no un sistema que relaciona una URL con una vista o un manejador. En NextJS, el App Router organiza las rutas dentro de `app/` y todas las carpetas hijas representan segmentos de una ruta, sin embargo estas se vuelven públicas solo cuando contienen un page.tsx o un router.ts

Resulta que NextJS sí tiene palabras como nombres de archivos reservados:
- page.tsx: lo que el usuario ve. Dentro de cada segmento de ruta, NextJS buscará este archivo y mostrará los componentes que este exporte. Cuando lo creamos en una ruta, Next automáticamente crea un layout.tsx, es decir, al parecer el layout es el que recibe los componentes que exporta page.tsx. es similar a un index.jsx

- layout.tsx: la estructura que lo envuelve. Es el contenedor de toda la aplicación, es como el React DOM que crea un elemento Root. Es interesante porque precisamente describe un componente base de toda la app, por lo que si se coloca algo en el body o en el html del layout, saldrá en todas las páginas que este tenga como hijas. La cuestión acá es que cada segmento de puede tener un grupo o un layout compartido específico para esa sección, cuando lo usamos, como ya hay un layout root, no necesitamos exportat html ni body, solo lo que queramos que tenga ese layout dentro del body. Esto nos permite definir cierta estructura especial que queremos que tenga una serie o grupo de rutas.

- route.tsx (route.ts): la lógica http de la ruta

- loading.tsx: lo que se ve mientras carga

- error.tsx: lo que se ve si algo falla.

Esos mismos archivos son los que definen los comportamientos que va a tener un segmento de ruta

También se pueden utilizar las grouping routes que son simplemente carpetas con nombres dentro de paréntesis y que son "invisibles" en la URL, es decir, si se tiene la ruta `app/(dashboard)/login` la ruta para acceder al login sería: `app/login`. Esta características sirve principalmente para organización.

> - Con esta información ya voy visualizando algunos aspectos del frontend, por ejemplo en el layout.tsx por lo que veo se debe renderizar condicionalmente dependiendo del rol, dicho de una manera muy general y simplificada.
> - Se puede también utilizar la etiqueta link propia de next para no recargar toda la página al cambiar entre rutas.

xd, eso de los page está interesante, pero recuerda a loos  init.py

### 2.3 React Server Components y React Client Components

Por defecto, NextJS renderiza del lado del servidor, esto significa que para manejar interactividad, efectos y en general dinamismo, debemos manejarla del lado del cliente, para ello usamos el indicador
```tsx
"use client"
```
 al inicio del componente que necesita interactividad.
 Si llamamos a un componente dentro de otro que está marcado con esa instrucción, el hijo será renderizado del lado del cliente.
las etiquetas metadata solo funcionan con renderizado del lado del servidor.

[Getting Started: Server and Client Components | Next.js](https://nextjs.org/docs/app/getting-started/server-and-client-components#when-to-use-server-and-client-components)

### 2.4 Tailwind y Shadcn/UI

#### 2.4.1 Tailwind

Resumen/definición más formal escrita por mí de lo que entiendo hasta ahora: TailWind es un framework de CSS que permite una alta personalización y reutilización de estilos a través de un sistema de utilidades conocidas como`utility classes`, las cuales son clases predefinidas con estilos y nombres que se pueden invocar directamente en el html y en los archivos donde se utilice. TailWind simplifica el añadir características a los componentes al definir ciertos comportamientos por defecto y al estructurar los nombres de las clases de una manera intuitiva, de modo que si se le quiere añadir una característica particular a un elemento, simplemente es agregarlo a su class o classname. Al principio tailwind puede parecer más verboso e incluso da impresión de mala practica al usarse dentro del html, pero su potencial se ve revelado cuando empezamos a reutilizar las clases, escribir el código con más velocidad y añadir utilidades o características avanzadas como pseudoclases y media querys del mismo css para usar inline. Al compilar o servir el proyecto, tailWind genera un .css en la marcha a medida que agregamos código, en el que define solamente lo que realmente se está utilizando, optimizando el uso de recursos en producción gracias a JIT (Just in Time Compiler)

Tailwind además permite añadir caractaerísticas personalizadas a parte de las utility classes que ofrece, hay varios métodos para ello, pero primero es importante saber que en general las utility tienen una estructura similar a: propiedadEtiqueta-atributo-variaciónDelAtributo y en variación del atributo o atributo es que podemos influir.

1. **Inline:** el valor puede ir dentro de `[]` para darle valores personalizados o más exactos, algo como `text-[13px]`. Esto funciona para tareas pequeñas, pero se quiere modularidad o reutilización no es el enfoque más adecuado, porque si se usa en muchas partes, si se quiere modificar, tocaría hacerlo en cada una de las secciones donde se utilizó.
2. **TaillwindCSS Directives:** Permite configurar estilos personalizados en CSS en lugar de JS. En la configuración de tailwind podemos usar las directivas que se diferencian por empezar con un `@directive`, entonces en el archivo buscaremos la directiva `@theme` en el cual modificaremos las diferentes utility classes que agregaremos a nuestro proyecto con la siguiente estructura:

		```
		--property1-name: value;
		//...
		--property1-name: value;
		
		```
	En general, podemos encontrar los namespaces para definir propiedades en: [Theme variables - Core concepts - Tailwind CSS](https://tailwindcss.com/docs/theme#theme-variable-namespaces)

Las directivas también nos ayudan a reutilizar código, a través de `@base`, `@components`, ``@layer``, 
Los temas se hacen con la directtiva ``@theme`` importando el tailwind css en el archivo a crear el tema, luego se utiliza un namespace y se le dan propiedades para dejarlo como una clase de tipo utilidad, aunque también se pueden configurar en tailwind.config.ts. Más que temas son design tokens, estos lo que hacen es definir una paleta de colores y diferentes atributos o clases utility para poder reutilizarlas en diferentes archivos. 

> "Theme variables are also required to be defined top-level and not nested under other selectors or media queries, and using a special syntax makes it possible to enforce that."

Cosas interesantes de tailwind:
- Cambiar acentos predeterminados de elementos del navegador
- Fluid texts: El texto cambia de tamaño (y supongo que estilos también) a medida que cambia el tamaño de la pantalla
- Definir una label con estilos y poner el botón predeterminado para subir archivos dentro.
- Color de resaltado
- etc.


Entonces, ¿Qué nos entrega Tailwind y cómo lo usamos? 
- Nos entrega clases predefinidas, resolviendo el problema de nombrarlas y las usamos como abreviaciones de los nombres equivalentes a las propiedades definidas en css manualmente.
- Tiene variaciones entre clases y sus efectos, por ejemplo diferentes tonos de colores se asocian a una clase, permitiendo usar practicamente una paleta de colores o paleta de características por cada propiedad definida.
- tailwind es como el linux de los frameworks de css, da el poder al programador de personalizar los estilos a partir de bloques base.
- Tailwind soporta nativamente el modo oscuro añadiendo dark:propiedadEtiqueta-atributo-variaciónDelAtributo, esto se adapta por defecto al tema del dispositivo/navegador, sin embargo si se quiere usar un toggle, se debe añadir la directiva: @custom-variant dark (&:where(.dark, .dark *));

#### 2.4.2 Shadcn/UI

Shadcn/ui no es una biblioteca tradicional de componentes; es un sistema de distribución de código para construir tu propia biblioteca de componentes. Sus piezas están diseñadas para ser accesibles, personalizables y copiadas dentro del proyecto, no consumidas como “caja negra”. Por eso trabaja tan bien junto con Tailwind.

La instalación de shadcn/ui no aplica igual para un proyecto puramente “HTML + Tailwind” sin framework. La documentación oficial indica que el sistema está disponible para frameworks soportados como Next.js, Vite, Laravel, React Router, Astro y TanStack Start. Si el proyecto es solo HTML estático con Tailwind, shadcn/ui no se instala directamente como tal; en ese caso, lo correcto es seguir con Tailwind puro o migrar a un framework compatible.

Para un proyecto Next.js, la instalación recomendada es: primero tener Tailwind instalado y el alias `@/*` configurado; luego ejecutar `pnpm dlx shadcn@latest init`; después agregar componentes con comandos como `pnpm dlx shadcn@latest add button`. En proyectos nuevos, la documentación también recomienda usar `shadcn/create` para ver colores, radios, tipografías e íconos antes de generar la configuración.

El tema de shadcn/ui se maneja principalmente con **CSS variables** y **theme tokens**. Sus tokens semánticos viven en `:root` y `.dark`, y luego Tailwind los expone como utilidades como `bg-background`, `text-foreground`, `border-border` o `ring-ring`. En otras palabras: shadcn define el significado visual de los tokens, y Tailwind los convierte en clases utilizables en los componentes.

La convención importante es que los tokens se trabajan en pares semánticos, por ejemplo `background` / `foreground`, `primary` / `primary-foreground`, `card` / `card-foreground`, `muted` / `muted-foreground`, etc. Eso permite que los componentes reutilicen los mismos nombres, pero cambien de apariencia según el tema. En MindBridge esto es valioso porque el rol del estudiante, el panel del psicólogo y los estados de alerta pueden compartir la misma lógica semántica sin usar los mismos colores exactos.

Si se quiere agregar un token nuevo, la documentación de shadcn/ui propone definirlo en `:root` y `.dark`, y luego exponerlo a Tailwind con `@theme inline`. Un ejemplo sería definir `--warning` y `--warning-foreground` en el CSS global y luego mapearlos a `--color-warning` y `--color-warning-foreground` para que aparezcan como utilidades de Tailwind.

```
:root {  --warning: oklch(0.84 0.16 84);  --warning-foreground: oklch(0.28 0.07 46);}.dark {  --warning: oklch(0.41 0.11 46);  --warning-foreground: oklch(0.99 0.02 95);}@theme inline {  --color-warning: var(--warning);  --color-warning-foreground: var(--warning-foreground);}
```

La idea práctica para MindBridge es esta: Tailwind da la mecánica de las utilidades y shadcn/ui te da una capa de componentes con tokens semánticos listos para adaptar. Para el proyecto, eso significa que no hace falta definir cada color a mano en cada botón, tarjeta o input; basta con ajustar los tokens del tema para que toda la app cambie de forma consistente.

Si el objetivo es instalar shadcn/ui en un proyecto existente con Tailwind, la ruta correcta es usar un framework soportado, configurar el alias, inicializar shadcn y luego añadir componentes.

>[!Preguntas] Preguntas sobre NextJS y Tailwind/Shadcn-ui
>
>- **¿Qué es un Router? ¿Es el mismo concepto en NextJS que en NodeJS con el router de express?**
>_Un **router** es el mecanismo que relaciona una URL con una respuesta: decide qué código se ejecuta cuando alguien pide una ruta concreta.
>En Next.js para App Router las rutas se definen por **sistema de archivos**. Next dice que usa folders y files para definir rutas, y que el App Router organiza esas rutas con convenciones especiales dentro de `app/`._
> - **¿Qué es una vista/manejador?**
>_En Next.js, una vista es básicamente lo que el usuario ve renderizado para una ruta; en App Router eso suele estar en page.tsx. Un manejador es otra cosa: es una función que responde a una petición HTTP, por ejemplo GET o POST, y en Next App Router eso vive en route.ts. Next incluso aclara que los Route Handlers son equivalentes a las API Routes antiguas del Pages Router._
> - **¿Qué significa hacer un segmento público?**
>  _En App Router, una carpeta por sí sola no se convierte en ruta pública solo por existir. Next explica que solo el contenido dentro del archivo `page` es públicamente accesible; la carpeta representa el segmento, pero la ruta visible aparece cuando ese segmento tiene su `page.tsx`._
> - **¿Es a fuerza que los manejadores (creo que se llaman así) se nombren page.tsx o router.tsx o layout.tsx? ¿qué son cada uno de estos archivos?**
>_En pocas palabras: Sí_
> 
> - **Al tener los archivos reservados .tsx dentro de una ruta, ¿Todos los segmentos hijos también se vuelven públicos?**
> _No automáticamente. Cada segmento necesita su propio `page.tsx` para ser una ruta pública. Si tienes `app/forum/page.tsx` y creas `app/forum/comments/` sin `page.tsx`, esa carpeta no es una ruta — Next.js la ignora como ruta pero puedes usarla para organizar archivos. Los hijos solo se vuelven públicos cuando tienen su propio `page.tsx`._
> - **¿En app debe haber al menos un page.tsx? Por ejemplo, si tengo una landingPage, ¿Neceseariamente debe ir en app/ o puede ir en app/landingPage/?**
> _En `app/page.tsx`. Ese archivo es la ruta raíz `/`. Si la pones en `app/landingPage/page.tsx`, la URL sería `/landingPage`, que no es lo que quieres. La ruta `/` es siempre `app/page.tsx`._
> - **¿Por qué se exporta el layout si se supone que es el root? ¿No debería simplemente usarse o ser como el index? De la misma manera, ¿Este layout importa y exporta "por detrás" las demás páginas dentro de app/?**
> _Next.js no importa las páginas automáticamente — su sistema de archivos funciona como convención, no como importación. El `layout.tsx` recibe un prop `children` que Next.js inyecta en tiempo de ejecución con la `page.tsx` del segmento activo. Tú exportas el layout para que Next.js pueda importarlo cuando lo necesite; no es que el layout "jale" las páginas, sino que el runtime de Next.js les da a ambos el rol que corresponde según la convención de archivos. Es el mismo principio que `__init__.py` en Python: el archivo existe para que el sistema lo reconozca, aunque tú no lo llames directamente._
> - **Al usar "use client" en un componente, ¿Los componentes hijos también serán renderizados del lado del cliente?**
> Depende de cómo lleguen. Hay dos casos:
 > 	- Si un hijo es **importado directamente** dentro de un Client Component, ese hijo también se vuelve cliente, aunque no tenga `"use client"`. La directiva crea una frontera y todo lo que está debajo de esa frontera por importación directa se arrastra al cliente.
 > 	- Si un hijo llega como **`children` prop**, puede seguir siendo un Server Component. Puedes pasar un Server Component como `children` a un Client Component y Next.js lo renderiza en el servidor antes de enviarlo como HTML al Client Component.
 > La regla práctica: si `CreatePostForm` es `"use client"` e importa `PostCard` dentro de su JSX, `PostCard` se vuelve cliente. Si `PostFeed` (server) renderiza `CreatePostForm` y le pasa `PostCard` como `children`, `PostCard` sigue siendo server. Este segundo patrón es el que hay que preferir.
 >
> - **¿Qué son las utility classes?**
> 	_Son clases CSS de propósito único — cada una hace exactamente una cosa. `mt-4` aplica `margin-top: 1rem`. `text-center` aplica `text-align: center`. `rounded-lg` aplica `border-radius: 0.5rem`. El enfoque opuesto sería escribir una clase `.card` con veinte propiedades. Con Tailwind componés las veinte propiedades escribiendo veinte clases cortas directamente en el HTML. La ventaja no es menos código — es que el significado de cada regla CSS es legible directamente en el marcado sin tener que buscar en un archivo `.css`._
> - **Una vez definidos los temas o design tokens, ¿Se usan igual que las mismas clases de tailwind? ¿O hay que exportat/importar algo adicional?**
> _Exacto. Cuando defines `--color-primary: #346B5A` en `@theme inline`, Tailwind lo expone como `bg-primary`, `text-primary`, `border-primary`, igual que cualquier color de su paleta por defecto. No hay importación extra — Tailwind genera las clases automáticamente a partir de las variables CSS que declaras bajo `@theme`. Los tokens de shadcn (`--primary`, `--background`, etc.) funcionan de la misma manera y Tailwind los convierte en `bg-background`, `text-foreground`, etc._
> - **¿Qué es esto de desarrollar con enfoque mobile first?** [Responsive design - Core concepts - Tailwind CSS](https://tailwindcss.com/docs/responsive-design#working-mobile-first)
> _En Tailwind, los breakpoints (`sm:`, `md:`, `lg:`, `xl:`) no son condiciones "si la pantalla es exactamente ese tamaño" — son condiciones "desde ese tamaño hacia arriba". Entonces si escribes `flex-col md:flex-row`, estás diciendo: columnas en mobile, filas desde 768px en adelante. El enfoque mobile-first es: escribe los estilos base para el tamaño más pequeño (sin prefijo), y usa los prefijos para añadir overrides en pantallas más grandes. Lo contrario — escribir para desktop y reducir con breakpoints — se llama desktop-first y es más difícil de mantener en Tailwind porque los prefijos no tienen un equivalente "máximo por defecto"._
> - **¿Cómo se usan las layers en combinación con components, las utility y la directiva theme?**
> 	Son tres registros con distinta prioridad:
> 	- `@theme` define variables CSS (design tokens). No genera clases directamente — le dice a Tailwind qué valores puede usar.
> 	- `@layer base` es para estilos globales de HTML: resets, estilos de `body`, `h1`, `p`, etc.
>	- `@layer components` es para clases reutilizables que agrupan utilidades: `.btn-primary { @apply bg-primary text-primary-foreground rounded-md px-4 py-2; }`. Útil cuando una combinación se repite mucho y no quieres un componente React solo por eso.
>	- `@layer utilities` es para utilidades que Tailwind no tiene: `.scrollbar-hidden { scrollbar-width: none; }`.
>	
>La jerarquía de especificidad es base < components < utilities. Una utility siempre gana sobre un component. En la práctica para MindBridge, usarás `@theme` para los tokens de color y casi nunca `@layer components` — los componentes React + clases Tailwind directas son más fáciles de mantener que clases CSS personalizadas._
> - **Con tailwind y el conocimiento de cómo fonfigurar temas y usar directivas, shadcn es simplemente como una extensión, ¿no?**
> _No exactamente — es una capa diferente. Tailwind es un generador de utility classes. shadcn es un generador de código de componentes. Cuando ejecutas `npx shadcn@latest add button`, shadcn copia el código fuente de `Button` a tu carpeta `components/ui/Button.tsx`. Ese código usa clases de Tailwind internamente y variables CSS para el tema. La diferencia con una librería como Chakra UI es que el código vive en tu proyecto y lo puedes modificar libremente. shadcn no es una dependencia npm en el sentido tradicional — es código que pasa a ser tuyo. Tailwind más shadcn juntos te dan: Tailwind maneja el CSS, shadcn maneja los componentes que usan ese CSS._






