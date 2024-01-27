from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from flask import Flask, request, Response, jsonify, render_template, send_file, session, flash, redirect, url_for
from flask_mail import Mail, Message
#from googletrans import Translator
from pygoogletrans.googletrans.client import Translator
from pymysql import IntegrityError
from google_speech import Speech
from romanization import *
from config import *
import hashlib
import socket
import pprint
import uuid
import html, json, math, os, re, requests, shutil, time, random, sys

app = Flask(__name__)
app.config["DEBUG"] = True
app.secret_key ='c08f0bed-ef60-4d24-84e1-cee0eb82cbe7'

def get_page(url):
    page = requests.get(url)
    return BeautifulSoup(page.content, "html.parser")

@app.route('/', methods=['GET'], endpoint = 'home_unlogged')
def home():
    if 'email' in session and session['email'] != None:
        return redirect(url_for('home_logged'))
    session['vip'] = 0
    return render_template('index.html')

@app.route('/api/random_sentences/<src_lang>/<tgt_lang>/<n>/<trans_mode>/<audio_mode>/<words>', methods=['GET', 'POST'])
def get_translations(src_lang, tgt_lang, n, trans_mode, audio_mode, words):
    n = int(n)
    clean_audios_directory()
    src_lang_tatoeba_code = find_language_by_google_code(src_lang)['tat']
    tgt_lang_tatoeba_code = find_language_by_google_code(tgt_lang)['tat']
    if words == '_':
        words = []
    else:
        words = words.split(',')
    sentences = get_tatoeba_sentences(src_lang, tgt_lang, src_lang_tatoeba_code, tgt_lang_tatoeba_code, n, trans_mode, words)
    final_sentences = []
    for sentence in sentences:
        audio_path_orig = ''
        audio_path_trans = ''
        if audio_mode == 'gtrans' and is_supported_tts_language(src_lang) and is_supported_tts_language(tgt_lang):
            audio_path_orig = save_tts_output(src_lang, sentence['src_sentence'])
            origtime = audio_path_orig[32:].replace(".mp3","")
            audio_path_trans = save_tts_output(tgt_lang, sentence['tgt_sentence'], origtime)
        final_sentences.append({'src_sentence': sentence['src_sentence'], 'src_rom': sentence['src_rom'], 
                                'tgt_sentence': sentence['tgt_sentence'], 'tgt_rom':sentence['tgt_rom'],
                           'audio_path_orig': audio_path_orig, 'audio_path_trans': audio_path_trans})
    return json.dumps(final_sentences)

def get_tatoeba_sentences(src_lang_goo, tgt_lang_goo, src_lang_tat, tgt_lang_tat, n, trans_mode, words):
    sentences = []
    global_counter = 0
    for i in range(0,calculate_tatoeba_iterations(n)):
        [ten_sentences, ten_translations] = scrape_ten_random_tatoeba_sentences(src_lang_tat, tgt_lang_tat, trans_mode, words)
        for j in range(0,10):
            global_counter += 1
            if global_counter <= n:
                sentence = ten_sentences[j]
                if len(sentence) <= 120:
                    if trans_mode == 'auto':
                        translation = translate(src_lang_goo, tgt_lang_goo, sentence)
                    else:
                        translation = ten_translations[j]
                    transorig = ''
                    transrom = ''
                    if has_romanization(src_lang_goo):
                        transorig = get_romanization(src_lang_goo, translation)
                    if has_romanization(tgt_lang_goo):
                        transrom = get_romanization(tgt_lang_goo, translation)
                    sentences.append({'src_sentence':sentence, 'src_rom':transorig,'tgt_sentence':translation, 'tgt_rom':transrom})
    return sentences

@app.route('/api/literal_sentences', methods=['POST'])
def get_translations_for_literal_sentences():
    src_sentences = json.loads(request.form['sentences'])
    src_lang = request.form['src_lang']
    tgt_lang = request.form['tgt_lang']
    audio_mode = request.form['audio_mode']
    clean_audios_directory()
    sentences = get_translations_for_src_sentences(src_sentences, src_lang, tgt_lang)
    final_sentences = []
    for sentence in sentences:
        audio_path_orig = ''
        audio_path_trans = ''
        if audio_mode == 'gtrans' and is_supported_tts_language(src_lang) and is_supported_tts_language(tgt_lang):
            audio_path_orig = save_tts_output(src_lang, sentence['src_sentence'])
            origtime = audio_path_orig[32:].replace(".mp3","")
            audio_path_trans = save_tts_output(tgt_lang, sentence['tgt_sentence'], origtime)
        final_sentences.append({'src_sentence': sentence['src_sentence'], 'src_rom': sentence['src_rom'], 
                                'tgt_sentence': sentence['tgt_sentence'], 'tgt_rom':sentence['tgt_rom'],
                           'audio_path_orig': audio_path_orig, 'audio_path_trans': audio_path_trans})
    return json.dumps(final_sentences)

def get_translations_for_src_sentences(src_sentences, src_lang, tgt_lang):
    sentences = []
    for i in range(0, len(src_sentences)):
        src_sentence = src_sentences[i]
        sentence = {'src_sentence': src_sentence }
        sentence['tgt_sentence'] = translate(src_lang, tgt_lang, src_sentence)
        transorig = ''
        transrom = ''
        if has_romanization(src_lang):
            transorig = get_romanization(src_lang, src_sentence)
        if has_romanization(tgt_lang):
            transrom = get_romanization(tgt_lang, sentence['tgt_sentence'])
        sentence['src_rom'] = transorig
        sentence['tgt_rom'] = transrom
        sentences.append(sentence)
    return sentences

def translate(src_lang_code, tgt_lang_code, text):
    translator = Translator()
    res = translator.translate(text, src=src_lang_code, dest=tgt_lang_code)
    text = re.sub(r'(?<=[.])(?=[^\s])', r' ', res.text)
    return text

def scrape_ten_random_tatoeba_sentences(src_lang, tgt_lang, trans_mode, words):
    url = "https://tatoeba.org/spa/sentences/search?query=#####&from={}&to={}&sort=random".format(
        src_lang, tgt_lang
    )
    if trans_mode == 'auto':
        url = "https://tatoeba.org/spa/sentences/search?query=#####&from={}&sort=random".format(src_lang)
    if words == []:
        url = url.replace("#####", "")
    else:
        url = url.replace("#####", "+".join(words))
    soup = get_page(url)
    divs = soup.findAll('div', {'class':'sentence-and-translations'})
    sentences = []
    human_translations = []
    DIV_START = "vm.init([], "
    DIV_END = '" sentence-and-translations=""'
    CHUNK_START = '"text":"'
    CHUNK_END = '"'

    for div in divs:
        div = str(div)
        start_position = div.find(DIV_START)
        end_position = div.find(DIV_END,start_position)
        chunk = div[start_position + len(DIV_START):end_position]
        chunk = html.unescape(chunk)
        chunk = chunk.encode().decode('raw_unicode_escape')
        positions = find_all_positions(chunk, CHUNK_START)
        count = 0

        for pos in positions:
            pos = int(pos)
            end_position = chunk.find(CHUNK_END, pos + len(CHUNK_START))
            sentence = chunk[pos + len(CHUNK_START):end_position]
            if count == 0:
                sentences.append(sentence)
            if count == 1 and trans_mode == 'human':
                human_translations.append(sentence)
            count = count + 1

    return [sentences, human_translations]

@app.route('/audios/<file>')
def audios(file):
    path = "/usr/src/app/audios/" + file + ".mp3"
    return send_file(path, as_attachment=False)

def find_all_positions(text, string):
    return [m.start() for m in re.finditer(string, text)]

def calculate_tatoeba_iterations(n_sentences):
    cociente = n_sentences / 10
    resto = n_sentences % 10
    added = 1
    if resto == 0:
        added = 0
    return math.floor(cociente) + added

def is_supported_tts_language(lang):
    langs = ['ar','af','de','es','ca','en','pt','it','ro','en',
             'de','tl','bg','bs','hr','sr','tr','zh-CN','ko','ja',
             'et','fr','el','ka','he','hi','id','lv','ml','ms',
             'nl','pl','ru','sw','th','uk','ur','vi']
    return lang in langs

def save_tts_output(lang, text, origtime = ''):
    speech = Speech(text, lang)
    unix_time = origtime
    if origtime == '':
        unix_time = time.time()
    time_str = str(unix_time).replace(".","")
    filename = lang + "_" + time_str + ".mp3"
    speech.save("audios/" + filename)
    base_url = get_base_url()
    return base_url + "/audios/{}".format(filename.replace(".mp3",""))

def speak(lang, text):
    speech = Speech(text, lang)
    speech.play()

def clean_audios_directory():
    folder = 'audios'
    for filename in os.listdir(folder):
        if 'gitkeep' in filename:
            continue
        file_path = os.path.join(folder, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print('Failed to delete %s. Reason: %s' % (file_path, e))

def process_word_string(txt):
    words = []
    chunks = txt.split(",")
    for chunk in chunks:
        word = chunk.strip()
        if len(word)>2 and word[0]=='/' and word[-1]=='/':
            word = word[1:-1]
        word = word.replace("'","''")
        words.append(word)
    return words

#From: https://stackoverflow.com/questions/7824101/return-http-status-code-201-in-flask
class InvalidUsage(Exception):
    status_code = 400

    def __init__(self, message, status_code=None, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv['message'] = self.message
        return rv

@app.errorhandler(InvalidUsage)
def handle_invalid_usage(error):
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response

@app.route('/get_languages', methods=['GET','POST'])
def get_languages():
    with open("languages.json") as file:
        languages=json.load(file)
        return json.dumps(languages)
    
@app.route('/fill_dominions', methods=['GET','POST'])
def fill_dominions():
    dominions = {}
    with open("dominions_es.json") as file:
        unsorted = json.load(file)
        sorted_ = sorted(unsorted, key=lambda d: d['sort']) 
        dominions['es'] = sorted_
    with open("dominions_en.json") as file:
        unsorted = json.load(file)
        sorted_ = sorted(unsorted, key=lambda d: d['sort']) 
        dominions['en'] = sorted_
    return json.dumps(dominions)
    
def find_language_by_google_code(google_code):
    languages = json.loads(get_languages())
    for language in languages:
        if language['goo'] == google_code:
            return language
    return None

def get_docker_container_ip():
    return socket.gethostbyname(socket.gethostname())

@app.after_request
def add_header(r):
    """
    Add headers to both force latest IE rendering engine or Chrome Frame,
    and also to cache the rendered page for 10 minutes.
    """
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    r.headers['Cache-Control'] = 'public, max-age=0'
    return r

@app.route('/test-translator/<txt>', methods=['GET'])
def test_translator(txt):
    return build_response(200, False, translate('es', 'en', txt))

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5044))
    app.run(debug=True, host='0.0.0.0', port=port)