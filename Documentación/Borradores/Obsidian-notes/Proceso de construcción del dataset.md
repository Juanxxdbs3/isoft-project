
1. Lugares de donde se extraerán los datos
	1. Investigar primero si hay datasets que nos sirvan.
	2. Si no los hay, recolectar datos de:
	- r/ansiedadsocial
	- r/desahogo
	- r/necesitoDesahogarme
	- r/ayudamexico
	- r/ESPSaludMental
	- Si existen otras comunidades considerarlas.
2. Setup del script y la API Key
3. Estructura del dataset
4. Limpieza del dataset
5. Etiquetado


Para el scraping de los posts en reddits ví que existen varias formas:

Usar un script sin API como seleniumbase y sus versiones CDP o Playright, con esta forma se debe usar el Usar la forma base de chrome/chromium para el bypass de captchas.
``` python
#
from playwright.sync_api import sync_playwright
from seleniumbase import sb_cdp

sb = sb_cdp.Chrome(use_chromium=True)
endpoint_url = sb.get_redirect_url() # Nota: En la imagen dice get_redirect_url o get_endpoint_url (está ligeramente cortado, comúnmente es get_endpoint_url)
endpoint_url = sb.get_endpoint_url()

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(endpoint_url)
    context = browser.contexts[0]
    page = context.pages[0]
    search = "reddit+scraper"
    url = f"https://www.reddit.com/r/webscraping/search/?q={search}"
    page.goto(url)
    sb.solve_captcha()  # Might not be needed
    sb.sleep(1)
    post_title = '[data-testid="post-title"]'
    page.wait_for_selector(post_title)
    for i in range(8):
        sb.scroll_down(25)
        sb.sleep(0.2)
    print('*** Reddit Posts for "%s":' % search)
    items = page.locator(post_title)
    for i in range(items.count()):
        item_text = items.nth(i).inner_text()
        print("* " + item_text)
```


```python
"""Reddit Search / Bypasses reCAPTCHA."""
from seleniumbase import SB

with SB(uc=True, test=True, use_chromium=True) as sb:
    search = "reddit+scraper"
    url = f"https://www.reddit.com/r/webscraping/search/?q={search}"
    sb.activate_cdp_mode(url)
    sb.solve_captcha()  # Might not be needed
    post_title = '[data-testid="post-title"]'
    sb.wait_for_element(post_title)
    for i in range(8):
        sb.scroll_down(25)
        sb.sleep(0.2)
    posts = sb.select_all(post_title)
    print('*** Reddit Posts for "%s":' % search)
    for post in posts:
        print("* " + post.text)
```

Aún asi, parece que este método no está disponible porque reddit ha mejorado su seguridad en la api.

La otra opción es usar una herramienta de google sheets o beatifulSoup

Y la que me dijo Claude:
PRAW:
Praw es un módulo o librería que permite una interacción sencilla, accesible y con enfoques de automatización a la API de reddit. Reddit por otra parte es una comunidad online en donde los usuarios se suscriben a subreddits y pueden interactuar con los demás usuarios a través de los nichos.

Para usarlo necesitamos:
- Conocimientos en cómo funciona Reddit y Python
- Cuenta de reddit
- Client ID & Client Secret
- Un agente de usuario

Es recomendado que se use un praw.ini.file para no exponer variables o datos sensibles al exterior.

praw se instala con 
`pip install praw`

Tiene dos modos, el read-only y el auth, uno permite publicar y hacer acciones mientras que el otro solo permite leer.
Entonces, necesitamos el read-only instance, ya que solo extraeremos textos. 

Para usarlo, por ejemplo para obtener una lista de las 10 primeras sumisiones hot, donde cada una contiene un post de un subreddit.
```python
reddit = praw.Reddit(client_id ='my client id',
                     client_secret ='my client secret',
                     user_agent ='my user agent')

# to verify whether the instance is read-only instance or not
print(reddit.read_only)

#obtan r/redditdev
subreddit = reddit.subreddit("redditdev")

print(subreddit.display_name)
# Output: redditdev
print(subreddit.title)
# Output: reddit development
print(subreddit.description)
# Output: a subreddit for discussion of ...

#now that we the subreddit we can obtain submissions (posts) sorted by [controversial gilded, hot, new, rising, top]. iterate on the first 10 hot submissions:
# assume you have a Subreddit instance bound to variable `subreddit`
for submission in subreddit.hot(limit=10):
    print(submission.title)
    # Output: the submission's title
    print(submission.score)
    # Output: the submission's score
    print(submission.id)
    # Output: the submission's ID
    print(submission.url)
    # Output: the URL the submission points to or the submission's URL if it's a self post
```

Podríamos considerar obtener los posts de un usuario en concreto si identificamos que su post contiene desahogos.


Para obtener la API KEY
-> User settings 
-> Privacy & security 
-> Advanced  (Third party authorizations) 
-> Are you a developer? create an app 
-> Between web app, installed app and script we normally will use script.
-> Select name, uri poner localhost con 8080, 

guardar personal use script y secret


#### Actualización y Cambio de enfoque
Reddit ha introducido una nueva política de privacidad y tratamiento de datos, la cual en resumen imposibilita el uso o apoyo de esta plataforma para el fin que tenemos, el cual es crear un pequeño dataset que nos sirva para fine-tunear a nuestro modelo BETO.

Los dos aspectos que lo dificultan son:
1. Reddit ahora requiere una solicitud de permiso + aprobación para el uso de su API, fue introducida hace 6 meses, en la cual se dice que: 

"_**Ending Self-Service API access**
Starting today, self-service access to Reddit’s public data API will be closed. Anyone looking to build with Reddit data, whether you’re a developer, researcher, or moderator, will need to request approval before gaining access._"

Y bajo la nueva política de privacidad y tratamiento de datos, habría que borrar el dataset e incluso el modelo luego de usarlo, además, incluso si pidiéramos ese permiso a través de: [Submit a request – Reddit Help](https://support.reddithelp.com/hc/en-us/requests/new?ticket_form_id=14868593862164&tf_14867328473236=api_request_type_research), no nos sería concedido porque dentro de sus practicas prohibidas está:
"_**No se permite la comercialización no autorizada ni el entrenamiento de inteligencia artificial**  
No puedes vender, licenciar, compartir ni comercializar de ninguna otra forma los datos de Reddit sin autorización expresa por escrito. Esto se extiende a la minería, la extracción o el uso de datos, tanto comerciales como no comerciales, para fines tales como la segmentación de anuncios o el entrenamiento de modelos de aprendizaje automático o de inteligencia artificial._"

#### **Por lo que buscaremos otros enfoques**

### Opción 1, Depresión y ansiedad

**MentalRiskES**

Es un dataset con datos anotados sobre depresión, ansiedad y desordenes alimenticios creado a partir de textos de grupos públicos de telegram, se limpiaron los mensajes dejando solamente al id del usuario y al texto en sí (para luego relacionar re-incidencias). Fue presentado en una conferencia en 2024. Para el etiquetado se usaron las plataformas doccano y prolific.

Está etiquetado los mensajes de 104 usuarios a partir de lo siguiente:

_In this way, we associated a user ID with some tags that emerged after averaging the annotators' decisions. The labels available for each set are:

- _Eating Disorder: suffer (s), control (c)
- _Depression: suffer + in favour (sf), suffer + against (sa), suffer + other (so), control (c)
- _Anxiety: suffer (s), control (c)

_Furthermore, were used these labels on doccano for anxiety: Sufre(1), No sufre(9), Contexto Económico (e), Contexto familiar (f), Contexto social (s), Contexto laboral (l), Contexto adicción(a), Contexto emergencia (m), Otro contexto(o)_

_and for depression: Sufre + en contra (1) Sufre + a favor (2), Sufre + Otro (3), No sufre(9), Contexto Económico (e), Contexto familiar (f), Contexto social (s), Contexto laboral (l), Contexto adicción(a), Contexto emergencia (m), Otro contexto(o)__

En cuanto a depresión y ansiedad, se ofrecen los dos objetos de nuestro interés se ofrecen las guías dadas a los anotadores para un entendimiento mayor de cómo funciona el dataset, se anoto bajo el criterio subjetivo de los anotadores con el siguiente objetivo, cito Para depresión: "_En concreto, se pretende (1) identificar a los usuarios que sufren el trastorno de ansiedad, (2) la actitud con la que se enfrenta al trastorno y (3) el posible contexto que pueda influir a la afectación del mismo._  y para depresión: _En concreto, se pretende (1) identificar a los usuarios que sufren
el trastorno de depresión, (2) la actitud con la que se enfrenta al trastorno y (3) el posible
contexto que pueda influir a la afectación del mismo._

En las guías además, aparecen criterios sobre los que anotar a cada uno de los padecimientos, un diagrama de flujo para determinarlo, lo que significa cada etiqueta, preguntas frecuentes y recomendaciones para la anotación.
Estas guías podrían ser útiles incluso para nosotros.

Sin embargo, es para acceder al dataset necesitamos permiso porque tiene contraseña y se puede pedir así:
To request access to the corpus, please fill this [form](https://docs.google.com/forms/d/e/1FAIpQLSfASdCzvR6DCWpFXb4eDpF6gh7CjhJKT1bH2l-SdCcxTP7l7Q/viewform?usp=header) and then contact:

- Alba M. Mármol Romero ([amarmol@ujaen.es](mailto:amarmol@ujaen.es))
- Arturo Montejo Ráez ([amontejo@ujaen.es](mailto:amontejo@ujaen.es))

Podríamos hacerlo, pero mientras tanto miremos las otras opciones.

### Opción 2, Ideación suicida

**somosnlp-hackathon-2023/suicide-comments-es**

Es un dataset está compuesto por comentarios de Reddit y Twitter, así como por entradas y salidas del conjunto de datos Alpaca, traducidos al español y clasificados en dos categorías: ideas o conductas suicidas y no suicidas.

Es un .csv que tiene dos campos:
`text` que consiste en el texto o comentario del usuario y `Label` que puede ser 1 si se presenta riesgo o ideación suicida y 0 si no lo hace.

Contiene 10 050 filas (777 clasificadas como «ideación o conducta suicida» y 9273 como «sin tendencias suicidas»).
Por lo que podríamos usar parcialmente este dataset, aunque no sé si sea por el formato o algo similar, pero al abrir el .csv los textos tienen de alguna manera en tildes o símbolos exclusivos del español caracteres como basura (@±Ã©...)

Los textos no suelen exceder las 20 palabras, lo cual es un aspecto importante para el contexto del proyecto.

A diferencia de la primer opción, este dataset si es públicamente accesible y sin permisos especiales. 
[Archivo csv](https://huggingface.co/datasets/somosnlp-hackathon-2023/suicide-comments-es/resolve/main/suicide_comments_es.csv)


### Opción 3, Ideación suicida

**PrevenIA/spanish-suicide-intent**

Este es similar a la opción 2 pero es MUCHO más grande ya que es más bien una recopilación de distintos datasets traducidos al español y etiquetados en forma binaria (0 o 1).

El .parquet tiene 3 campos: `text` que consiste en el texto o comentario del usuario, `Label` que puede ser 1 si se presenta riesgo o ideación suicida o 0 si no lo hace y `Dataset` para la fuente u origen del comentario.

No sé cómo abrir un parquet pero se descarga acá:
[Dataset]([PrevenIA/spanish-suicide-intent at main](https://huggingface.co/datasets/PrevenIA/spanish-suicide-intent/tree/main/data))


### Opción 4, Ideación suicida

**Kvvaldez / Spanish Suicide**

Otra opción como las anteriores, tiene 2069 filas y 3 labels:
`frase` que parece que se usó para entrenar un modelo que se dispara con frases clave, `tweet_clean` que es el texto o comentario del usuario, por lo que intuyo que este fue recolectado a partir de tweets, `suicidio` que indica 1 para ideación suicida y 0 si no.

[Dataset]([spanish_suicide/dataset/suicidio_notacion.csv at master · kvvaldez/spanish_suicide](https://github.com/kvvaldez/spanish_suicide/blob/master/dataset/suicidio_notacion.csv))


### Opción 5, Depresión

**Kaggle: Spanish tweets suggesting depression**

Kaggle parece ser una plataforma similar a hugginFace o Github, es una plataforma para repositorios o proyectos. En todo caso, encontré uno que recolecta 1000 tweets en español de 90 usuarios diferentes y que podrían o no sugerir depresión. El datsaset es público y se puede descargar como csv, tiene 4 campos: `TWEET_ID_ANON`, `USER_ID_ANON`, `TWEET_TEXT`, `CREATED_AT`, por lo que podemos ver que no están anotados y tocaría hacer anotación manual.

[Spanish tweets suggesting depression](https://www.kaggle.com/datasets/francescoronzano/spanish-tweets-suggesting-depression/data)



### Construcción de Dataset

Afortunadamente, la Dra. Romero nos respondió de manera oportunidad y obtuvimos acceso a los corpus de MentalRiskES, por lo que tenemos 3 corpus muy ricos en los ambitos que nos interesan: Depresión y ansiedad combinados, suicidio y el corpus que utiliza MentalRiskES en raw y processed.

El detalle aparece cuando vemos que MentalRiskES utiliza un enfoque de anotación por sujeto y no a nivel de mensaje individual, 

Claude ha sugerido el Weakly Supervised learning, entonces aclaremos un poco el panorama:

El aprendizaje supervisado a pesar de que tiene variantes, por lo general busca dar un conjunto de datos etiquetados y correctamente estructurados de modo que se relacionan con un conjunto o set de entrada y otro de salida, así el modelo aprende a ajustar o crear modelos matemáticos para hacer coincidir el valor de un dato de entrada con el de salida, de ese modo puede usar ese modelo para "predecir" datos de salida a partir de nuevas entradas.

El aprendizaje no supervisado consiste en darle datos de entrada que no están etiquetados o que son un poco inciertos al modelo porque no se sabe muy bien qué datos debe producir como salida, de esta manera se deja que este extraiga los patrones o información que puede inferir a partir del dataset, de esta manera puede agrupar o asociar más tarde los nuevos datos de entrada.

Por otra parte el aprendizaje débilmente supervisado o Weakly Supervised Learning veo que se enfoca en una tarea específica o un campo de dominio acotado y que marcan de alguna manera a partir de nuevos datos de entrenamiento(?, el punto es que se aprovecha muy bien de datos anotados pero no con la calidad o granularidad que necesita el modelo a entrenar, , por lo que es más fácil darle los datos en este punto que colocarse a anotarlos o limpiarlos aún más, sin embargo esta practicidad tiene el costo de precisión, pues los modelos entrenados bajo este paradigma no son tan "sharpen". En el caso de mindbridge se puede notar porque los datos de MentalRiskES no están anotados a nivel de mensaje que es lo que se necesita, si no a nivel de sujeto o round, por lo que además de ser el estándar de la industria o la investigación, también nos conviene usar este tipo de enfoque.

Para la construcción del dataset estaremos usando MentalRiskEs corpus raw depressed y anxiety, task3, suicide-comments-es, kaggle-depression-tweets, y manual_anxiety que son unos que recolecté.

**Enlaces de interés**

1. [Introducing the Responsible Builder Policy + new approval process for API access : r/redditdev](https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/)
2. [Comment Extraction and Parsing - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/tutorials/comments.html)

3. [Running Multiple Instances of PRAW - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/getting_started/multiple_instances.html)

4. [Quick Start - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/getting_started/quick_start.html)

5. [Detecting Signs of Depression in Tweets in Spanish: Behavioral and Linguistic Analysis - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6620890/)

6. https://www.jmir.org/2019/6/e14199

7. [MentalRiskES 2024 - Tasks](https://sites.google.com/view/mentalriskes2024/tasks#h.bqsxq2rlfhth)