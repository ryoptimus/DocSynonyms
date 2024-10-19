# app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
print("Importing nltk...")
import nltk
print("nltk imported.")
print("Importing spacy...")
import spacy
print("spacy imported.")
from nltk.corpus import wordnet as wordnet

nltk.download('wordnet', quiet=True)
print("Loading spaCy language model...")
nlp = spacy.load('en_core_web_sm')
print("Model loaded.")

app = Flask(__name__)
CORS(app)

# TODO: Make these generated synonyms better oml

def get_lemmatized_form(word):
    doc = nlp(word)
    return doc[0].lemma_

def get_more_synonyms(original_word, synonyms):
    new_round_synonyms = []
    for synonym in synonyms:
        print(f"Fetching synonyms for {synonym}...")
        word = synonym['synonym']
        for synset in wordnet.synsets(word):
            for lemma in synset.lemmas():
                if lemma.name() != original_word:
                    print(f"[GET_MORE_SYNONYMS] {lemma.name()} != {original_word}. Appending...")
                    print(f"[GET_MORE_SYNONYMS] Lemma count for synonym {lemma.name()}: {lemma.count()}")
                    part_of_speech = synset.pos()
                    new_round_synonyms.append({"synonym": lemma.name(), "part_of_speech": part_of_speech})
    return synonyms + new_round_synonyms

def remove_duplicate_synonyms(synonyms):
    seen_synonyms = set()
    unique_synonyms = []
    for synonym in synonyms:
        if synonym['synonym'] not in seen_synonyms:
            seen_synonyms.add(synonym['synonym'])
            unique_synonyms.append(synonym)
    return unique_synonyms
            

@app.route('/get_synonyms', methods=['GET'])
def get_synonyms():
    word = request.args.get('word')
    lemmatized_word = get_lemmatized_form(word)
    print(f"Finding synonyms for '{lemmatized_word}'...")
    synonyms = []
    for synset in wordnet.synsets(lemmatized_word):
        for lemma in synset.lemmas():
            if lemma.name() != word:
                print(f"[GET_SYNONYMS] {lemma.name()} != {word}. Appending...")
                print(f"[GET_SYNONYMS] Lemma count for synonym {lemma.name()}: {lemma.count()}")
                part_of_speech = synset.pos()
                synonyms.append({"synonym": lemma.name(), "part_of_speech": part_of_speech})
    if 0 < len(synonyms) < 10:
        print("Synonyms are too few, fetching more...")
        synonyms = remove_duplicate_synonyms(get_more_synonyms(word, synonyms))
    print("Synonyms found.")
    return jsonify(synonyms), 200

@app.route('/')
def home():
    return "Flask is working!"

if __name__ == '__main__':
    app.run(debug=True)
