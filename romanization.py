from hangul_romanize import Transliter
from hangul_romanize.rule import academic
from lang_trans.arabic import buckwalter
from pykakasi import kakasi
from transliterate import translit
import pinyin, re

def has_romanization(code):
    codes = ["hy","el","ka","ru","zh-CN","ko","ja","ar","hi"]
    if code in codes:
        return True
    return False

def get_pinyin(txt):
    txt2 = ""
    for character in txt:
        txt2 += character + " "
    return pinyin.get(txt2)

def get_hangul(txt):
    transliter = Transliter(academic)
    return transliter.translit(txt)

def get_romaji(txt):
    kakasi_ = kakasi()
    kakasi_.setMode("H","a") # Hiragana to ascii, default: no conversion
    kakasi_.setMode("K","a") # Katakana to ascii, default: no conversion
    kakasi_.setMode("J","a") # Japanese to ascii, default: no conversion
    kakasi_.setMode("r","Hepburn") # default: use Hepburn Roman table
    kakasi_.setMode("s", True) # add space, default: no separator
    kakasi_.setMode("C", True) # capitalize, default: no capitalize
    conv = kakasi_.getConverter()
    result = conv.do(txt)
    return result

def get_arabic_transliteration(txt):
    return buckwalter.transliterate(txt)

#from: https://pandey.github.io/posts/transliterate-devanagari-to-latin.html    
def deva_to_latn(text):
    conversiontable = { 'ॐ' : 'oṁ', 'ऀ' : 'ṁ', 'ँ' : 'ṃ', 'ं' : 'ṃ', 'ः' : 'ḥ', 'अ' : 'a', 'आ' : 'ā', 'इ' : 'i', 'ई' : 'ī', 'उ' : 'u', 'ऊ' : 'ū', 'ऋ' : 'r̥', 'ॠ' : ' r̥̄', 'ऌ' : 'l̥', 'ॡ' : ' l̥̄', 'ऍ' : 'ê', 'ऎ' : 'e', 'ए' : 'e', 'ऐ' : 'ai', 'ऑ' : 'ô', 'ऒ' : 'o', 'ओ' : 'o', 'औ' : 'au', 'ा' : 'ā', 'ि' : 'i', 'ी' : 'ī', 'ु' : 'u', 'ू' : 'ū', 'ृ' : 'r̥', 'ॄ' : ' r̥̄', 'ॢ' : 'l̥', 'ॣ' : ' l̥̄', 'ॅ' : 'ê', 'े' : 'e', 'ै' : 'ai', 'ॉ' : 'ô', 'ो' : 'o', 'ौ' : 'au', 'क़' : 'q', 'क' : 'k', 'ख़' : 'x', 'ख' : 'kh', 'ग़' : 'ġ', 'ग' : 'g', 'ॻ' : 'g', 'घ' : 'gh', 'ङ' : 'ṅ', 'च' : 'c', 'छ' : 'ch', 'ज़' : 'z', 'ज' : 'j', 'ॼ' : 'j', 'झ' : 'jh', 'ञ' : 'ñ', 'ट' : 'ṭ', 'ठ' : 'ṭh', 'ड़' : 'ṛ', 'ड' : 'ḍ', 'ॸ' : 'ḍ', 'ॾ' : 'd', 'ढ़' : 'ṛh', 'ढ' : 'ḍh', 'ण' : 'ṇ', 'त' : 't', 'थ' : 'th', 'द' : 'd', 'ध' : 'dh', 'न' : 'n', 'प' : 'p', 'फ़' : 'f', 'फ' : 'ph', 'ब' : 'b', 'ॿ' : 'b', 'भ' : 'bh', 'म' : 'm', 'य' : 'y', 'र' : 'r', 'ल' : 'l', 'ळ' : 'ḷ', 'व' : 'v', 'श' : 'ś', 'ष' : 'ṣ', 'स' : 's', 'ह' : 'h', 'ऽ' : '\'', '्' : '', '़' : '', '०' : '0', '१' : '1', '२' : '2', '३' : '3', '४' : '4', '५' : '5', '६' : '6', '७' : '7', '८' : '8', '९' : '9', 'ꣳ' : 'ṁ', '।' : '.', '॥' : '..', ' ' : ' ', }
    consonants = '\u0915-\u0939\u0958-\u095F\u0978-\u097C\u097E-\u097F'
    vowelsigns = '\u093E-\u094C\u093A-\u093B\u094E-\u094F\u0955-\u0957'
    nukta = '\u093C'
    virama = '\u094D'
    devanagarichars = '\u0900-\u097F\u1CD0-\u1CFF\uA8E0-\uA8FF'
    word = text.strip()
    curr = ''
    for index, char in enumerate(word):
        if re.match('[' + devanagarichars + ']', char):
            if re.match('[' + consonants + ']', char):
                nextchar = word[(index + 1) % len(word)]
                if nextchar:
                    if re.match('[' + nukta + ']', nextchar):
                        cons = char + nextchar
                        nukta_present = 1
                    else:
                        cons = char
                        nukta_present = 0
                        if re.match('[' + vowelsigns + virama +']', nextchar):
                            trans = conversiontable.get(cons, '')
                            curr = curr + trans
                        else:
                            trans = conversiontable.get(cons, '')
                            trans = trans + "a"
                            curr = curr + trans
            else:
                trans = conversiontable.get(char, '')
                curr = curr + trans
        else:
            curr = curr + char
    return curr

def get_latin(inputtext):
    all_words = []
    for word in inputtext.split():
        latin_output = deva_to_latn(word)
        all_words.append(latin_output)
        joined_all_words = ' '.join(all_words)
    return joined_all_words

def get_hindi_transliteration(txt):
    return get_latin(txt)

def get_romanization(lang_code, txt):
    if lang_code in ["hy","el","ka","ru"]:
        return translit(txt, lang_code, reversed=True)
    elif lang_code == "zh-CN":
        return get_pinyin(txt)
    elif lang_code == "ko":
        return get_hangul(txt)
    elif lang_code == "ja":
        return get_romaji(txt)
    elif lang_code == "ar":
        return get_arabic_transliteration(txt)
    elif lang_code == "hi":
        return get_hindi_transliteration(txt)
    return ""
