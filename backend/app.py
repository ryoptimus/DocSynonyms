# app.py

from flask import Flask
from flask_cors import CORS
print("Importing nltk...")
import nltk
print("nltk imported.")
print("Importing spacy...")
import spacy
print("spacy imported.")
from nltk.corpus import wordnet as wordnet

app = Flask(__name__)
CORS(app)


@app.route('/')
def home():
    return "Flask is working!"

if __name__ == '__main__':
    app.run(debug=True)
