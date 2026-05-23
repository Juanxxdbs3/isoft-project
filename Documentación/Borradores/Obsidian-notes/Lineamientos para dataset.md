
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

[Introducing the Responsible Builder Policy + new approval process for API access : r/redditdev](https://www.reddit.com/r/redditdev/comments/1oug31u/introducing_the_responsible_builder_policy_new/)

[Comment Extraction and Parsing - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/tutorials/comments.html)

[Running Multiple Instances of PRAW - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/getting_started/multiple_instances.html)

[Quick Start - PRAW 7.7.1 documentation](https://praw.readthedocs.io/en/stable/getting_started/quick_start.html)

