
Ahora mismo hay que hacer el punto 3.2 del documento manual del sistema. Hay que argumentar las decisiones y mostrar las vistas 3.2.1 y 3.2.2 del sistema.

Para construir esto, me apoyaré en las recomendaciones que dio el profesor:

1. Definir qué debemos hacer:
	- Definir el tipo de aplicación: Con ayuda de los requisitos, características de los usuarios, sus intereses y las restricciones del sistema, debemos crear una solución que responda y satisfaga las necesidades de manera idónea. Debemos argumentar por qué elegimos ese tipo de aplicación.
	- Arquitectura del sistema: Una vez elegido el tipo de aplicación, propondremos una arquitectura para nuestro sistema con ayuda de las arquitecturas de referencia que existen y están documentadas para el tipo elegido. Esta arquitectura se elige porque se adapta a las necesidades de la aplicación. Cada una de las partes en las que se organiza es coherente con el modelo de requisitos del sistema. 
	- Para definir los componentes y contextualizar las diferentes partes, debemos ver las funcionalidades que tiene el sistema, cada componente resuelve una de las funcionalidades y responde a necesidades que se plantearon como requisitos.
	

Entonces, hagamos eso:

1. El tipo de aplicación que elegimos es: 

Nuestra aplicación, desde el punto de vista en la nube es una SaaS, además es una aplicación web hibrida (que una parte funciona en teléfonos y pcs principalmente y las otras funcionan en pcs), esto por las características de los usuarios y los escenarios en los que predecimos que la aplicación tendrá mayor uso. Se diseña con enfoque _Mobile first_ ya que es más fácil desescalar y reacomodar los elementos sobre todo visuales de una pantalla más pequeña a una más grande, mientras que lo contrario suele requerir más trabajo.

2. La arquitectura que elegimos es: 

Considero que la de microservicios y la de patrón de capas son las que más responden a nuestras necesidades, dado que debemos aplicar los patrones GRASP y principios solid, así como ajustarnos al proceso de ingeniería de software, estas dos arquitecturas permiten no solo cumplir con esos patrones si no que más tarden contribuyen al cumplimiento de los atributos de calidad del sistema. De esta manera, la arquitectura permite la implementación de las diferentes funciones que se plantearon en el modelo de requisitos, y teniendo en cuenta que la aplicación no será dirigida a un solo actor y además estos presentan intereses complementarios pero muy diferentes

Puede que la arquitectura limpia también sea una buena opción, pero no la comprendo aún y de hecho no sé si aplique o sea adecuada para una aplicación de un tamaño como el que proyecta MindBridge.




La arquitectura MVC se considera monolítica, pero es el típico y el más usado para proyectos web, ya que si el proyecto es pequeño suele ser sencillo de implementar. Se considera monolítica no porque allá un acoplamiento muy alto, si no por la antigüedad y el surgimiento de nuevas arquitecturas.

Existe microservicios, donde cada uno y sus datos están completamente desacoplados lo que facilita su mantenimiento. Normalmente se despliegan en contenedores.

Existe nativa de la nube, se enfoca en el cómo no en el dónde. Normalmente se utiliza cuando se planea desplegar en contenedores.

Patrón de capas: Básicamente acá se va construyendo una capa sobre otra y en las cuales hay diferentes niveles de abstracción, típicamente es presentación, controlador, aplicación, dominio, persistencia. Una capa puede separarse en niveles, que son básicamente distribuir la lógica en subcapas.

Arquitectura limpia: La arquitectura limpia coloca la lógica de negocios y el modelo de aplicación en el centro de la aplicación. En lugar de que la lógica de negocios dependa del acceso a los datos o de otras consideraciones de infraestructura, esta dependencia se invierte: ahora los detalles de la infraestructura y la implementación dependen del núcleo de la aplicación. Esta funcionalidad se logra mediante la definición de abstracciones, o interfaces, en Application Core, que luego se implementan mediante tipos definidos en el nivel de infraestructura. Una forma común de visualizar esta arquitectura es usar una serie de círculos concéntricos, similares a una cebolla.



>[!Preguntas]
>- ¿Qué es exactamente un microservicio?
>- ¿Cuándo se considera una aplicación pequeña, mediana, grande o empresarial?
> - ¿Por qué no aplicar Mobile first no es una buena decisión y suele dar más trabajo? ¿Qué hace que sea más difícil adaptar de pantalla grande a pantalla pequeña?
> - No entendí muy bien la arquitectura limpia, ¿En qué consiste exactamente?
> - ¿Qué es un componente?
> - ¿Será mejor separar la lógica de estudiante y la del psicólogo por capas?









Cambios que estoy haciendo en El ER_3
- Cambio a la descripción de funcionalidades del producto.
- 
