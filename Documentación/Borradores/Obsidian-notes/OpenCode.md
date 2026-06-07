
Open code es un sistema con interfaz de consola para programación agéntica.

Entonces, _¿Qué es un agente?_

Lo primero que necesitamos para usar OpenCode es una consola, en mi caso elegiré Warp por recomendación de tutoriales y su alta integración con herramientas como la que usaremos.

Warp tiene ciertas herramientas e integración nativa con IA que exploraremos luego.

Ahora, OpenCode lo instalamos a través de npm -g porque por curl al parecer era como para linux.

_En todo caso ando dudando en la forma en la que accede a los modelos porque yo tengo github copilot education, pero en vscode no me deja usar el sonnet ni opus 4.6, pero en OpenCode sí me deja, ¿Será que me cobrarían?_
No no lo harán, simplemente están allí, pero con el plan student de copilot puedo usar Haiku 4.5, Gemini 2.5, 3 flash y 3.1 Pro, GPT 5 y 5.4 Mini y raptor mini 

SPEC.md determina las específicaciones de cómo debe ser el proyecto, en pocas palabras es un tipo de documento de requisitos, se coloca en la raíz del proyecto.

/init creará un archivo agents.md el cual, no solo es la memoria principal del llm frente al proyecto si no que permite describir las decisiones arquitectónicas del proyecto, dependencias, cómo utilizar cada aspecto, en general instrucciones específicas, comandos, datos claves, filtros, etc. Cuánto más pequeño y más claro, mejor, pero igual es mejor ser específico, de modo que las decisiones de gestión y que deben ser persistentes a lo largo del proyecto sean tomadas en cuenta siempre por el agente. Este archivo debe subirse al repo.

Ahora, a los agentes también les podemos colocar skills, las cuales son potenciadoras para las capacidades que tiene un modelo, permiten enseñarle cosas o a usar herramientas, modos, o tácticas que de otro modo le costaría llegar a ellas o directamente no podría hacerlo, son una invención de Anthropic y hay bibliotecas como skills.sh disponibles con enfoques muy específicos para cada apartado de software o productividad. Para instalar skills recomendadas dependiendo de cada proyecto se puede usar autoskill, una herramienta creada por midudev que identifica las dependencias del proyecto y su naturaleza y recomienda skills basado en ello. Esta herramienta podría ser instalada como dev-dependencies no como dependencias de producción.
No deberíamos instalar skills globales, si no a nivel de proyecto incluso si toca reinstalar.

OpenCode trae 2 agentes integrados visibles: Plan y Build, también tiene otros un poco más ocultos como compact, title y resume. Tiene subagentes como explore, general y otros
podemos crear nuestros propios agentes o subagentes, y le podemos dar permisos a cada uno de ellos o herramientas que pueden utilizar. Esto nos permite crear agentes especializados para tareas concretas.
En un solo prompt podemos llamar varios subagentes con @

Para crear o configurar agentes, hay varias formas, la primera es con opencode.json, pero usaremos la segunda en la cual estos deben estar de manera global en .config/opencode/agents/agent-name.md, pero nosotros lo usaremos por proyecto y así es: .opencode/agents/. La última forma es simplemente desde el prompt escribir opencode agent create. un agent_name.md Tiene esta estructura más o menos:

```md
description: Reviews code for quality and best practices
mode: subagent
model: anthropic/claude-sonnet-4-20250514
temperature: 0.1
tools:
  write: false
  edit: false
  bash: false


You are in code review mode. Focus on:

- Code quality and best practices
- Potential bugs and edge cases
- Performance implications
- Security considerations

Provide constructive feedback without making direct changes.
```

agents.md como es el orquestador decide qué subagente debe cada agente invocar, en este documento debemos delegar a un especialista en documentación para que cada vez que un subagente vaya terminando una tarea, la vaya marcando como completada o directamente vaya actualizando las directivas.

Design.md  específica todo lo que es relacionado a estilos, colores, accesibilidad y todo lo que tiene que ver con aspectos de la presentación de un proyecto, sus requisitos y lineamientos para interfaces de usuario o vistas.

Skills recomendadas:
frontend-design-skill
supabase-best-practices


¿Se puede llamar a un agente con @ o solo se puede cambiar entre ellos (principales) con tab?
¿Cuál es la diferencia entre sesiones y agentes?
No, solo se puede llamar sub-agentes con @ y agentes principales haciendo switch entre agentes con tab o con /agent.
La sesión es un contexto conversacional mientras que los agentes son los roles con capacidades específicas que toma la IA frente a ese contexto.
