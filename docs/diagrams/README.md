# Guía de lectura de diagramas

## Formato

Cada diagrama existe en dos formatos:

- `.png` — imagen visual para revisión rápida.
- `.txt` — descripción estructurada en texto plano, **preferida para agentes de IA**
  porque no requiere visión y tiene menor costo de contexto.

## Cómo leer los archivos .txt

Cada archivo sigue esta estructura:

```
DIAGRAM: [nombre]
TYPE: Class Diagram | Component Diagram
CLASS: [Paquete::NombreClase]
STEREOTYPE: service | boundary | infrastructure | interface | utility | enumeration
ATTRIBUTES: [lista de atributos con visibilidad y tipo]
METHODS: [lista de métodos con firma]
INTERFACE: [nombre]
METHODS: [lista]
ENUM: [nombre]
FIELDS: [lista de valores]
RELATIONS:

[Origen] -> [Destino] (Tipo de relación, "etiqueta opcional")
```

## Tipos de relación

| Tipo en .txt | Significado UML                            |
| ------------ | ------------------------------------------ |
| Realization  | La clase implementa la interfaz            |
| Inheritance  | Herencia (`extends`)                       |
| Composition  | El hijo no existe sin el padre             |
| Aggregation  | Asociación con ciclo de vida independiente |
| Dependency   | Usa, pero no posee                         |
| Association  | Relación bidireccional sin propiedad       |

## Diagramas disponibles

| Archivo                            | Contenido                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------- |
| `arquitectura-sistema-componentes` | Diagrama de componentes: capas, interfaces y comunicación entre servicios |
| `entidades-del-negocio`            | Entidades del dominio con atributos y relaciones                          |
| `triage-forum-module`              | Módulo de triaje y foro: TriageService, ForumManager, NLPRestAdapter      |
| `attention-alerts-module`          | Módulo de atención y alertas: AttentionService, ChatManager, adaptadores  |
| `persistence-and-infraestructure`  | Repositorios Supabase e interfaces de persistencia                        |
| `presentacion-e-interfaz`          | FachadaAplicacion, routers de UI, DTOs                                    |
| `types`                            | Enumeraciones del sistema                                                 |

## Precedencia entre documentos

Ante una contradicción entre un diagrama y un contrato, **el contrato tiene precedencia**.
Los contratos en `docs/contracts/` son la fuente de verdad para implementación.
Los diagramas representan la vista de diseño conceptual.
