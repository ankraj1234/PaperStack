import numpy as np
import re
import string
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle

# Load model
model = load_model('model.h5')

# Load tokenizer and multilabel binarizer
with open('tokenizer.pickle', 'rb') as handle:
    token = pickle.load(handle)

with open('multilabel_binarizer.pickle', 'rb') as handle:
    multilabel_binarizer = pickle.load(handle)

maxlen = 500  # As defined in your previous code

# Preprocessing
def strip_links(text):
    link_regex = re.compile(r'((https?):((//)|(\\\\))+([\w\d:#@%/;$()~_?\+-=\\\.&](#!)?)*)', re.DOTALL)
    links = re.findall(link_regex, text)
    for link in links:
        text = text.replace(link[0], ', ')
    return text

def remove_punctuations(text):
    return text.translate(str.maketrans('', '', string.punctuation))

def preprocess_input(text):
    text = strip_links(text)
    text = text.replace("\n", ' ')
    text = remove_punctuations(text)
    seq = token.texts_to_sequences([text])
    pad_seq = pad_sequences(seq, maxlen=maxlen)
    return pad_seq

# Prediction function
def predict_categories(title, abstract):
    full_text = title + '. ' + abstract
    processed_text = preprocess_input(full_text)
    prediction = model.predict(processed_text)
    thresholded_prediction = prediction > 0.5

    if thresholded_prediction.any():
        predicted_labels = multilabel_binarizer.inverse_transform(thresholded_prediction)
    else:
        max_label_index = prediction.argmax()
        max_label = [multilabel_binarizer.classes_[max_label_index]]
        predicted_labels = [max_label]

    return predicted_labels

def extracts_keywords(full_text):
    processed_text = preprocess_input(full_text)
    prediction = model.predict(processed_text)
    thresholded_prediction = prediction > 0.5

    if thresholded_prediction.any():
        predicted_labels = multilabel_binarizer.inverse_transform(thresholded_prediction)
    else:
        max_label_index = prediction.argmax()
        max_label = [multilabel_binarizer.classes_[max_label_index]]
        predicted_labels = [max_label]

    return predicted_labels

# Category names
arxiv_categories = {
    "cs.AI": "Artificial Intelligence",
    "cs.AR": "Hardware Architecture",
    "cs.CE": "Computational Engineering, Finance, and Science",
    "cs.CL": "Computation and Language",
    "cs.CR": "Cryptography and Security",
    "cs.CV": "Computer Vision and Pattern Recognition",
    "cs.DB": "Databases",
    "cs.DC": "Distributed, Parallel, and Cluster Computing",
    "cs.DM": "Discrete Mathematics",
    "cs.GT": "Computer Science and Game Theory",
    "cs.IR": "Information Retrieval",
    "cs.IT": "Information Theory",
    "cs.LG": "Machine Learning",
    "cs.LO": "Logic in Computer Science",
    "cs.NI": "Networking and Internet Architecture",
    "cs.OS": "Operating Systems",
    "cs.PL": "Programming Languages",
    "cs.RO": "Robotics",
    "cs.SD": "Sound",
    "cs.SE": "Software Engineering",
    "econ.EM": "Econometrics",
    "econ.GN": "General Economics",
    "econ.TH": "Theoretical Economics",
    "eess.AS": "Audio and Speech Processing",
    "eess.IV": "Image and Video Processing",
    "eess.SP": "Signal Processing",
    "math.AC": "Commutative Algebra",
    "math.AP": "Analysis of PDEs",
    "math.AT": "Algebraic Topology",
    "math.CO": "Combinatorics",
    "math.CV": "Complex Variables",
    "math.GR": "Group Theory",
    "math.IT": "Information Theory",
    "math.LO": "Logic",
    "math.NT": "Number Theory",
    "math.PR": "Probability",
    "math.QA": "Quantum Algebra",
    "math.ST": "Statistics",
    "q-bio.BM": "Biomolecules",
    "q-bio.CB": "Cell Behavior",
    "q-bio.GN": "Genomics",
    "q-bio.MN": "Molecular Networks",
    "q-bio.NC": "Neurons and Cognition",
    "q-bio.TO": "Tissues and Organs",
    "q-fin.CP": "Computational Finance",
    "q-fin.EC": "Economics",
    "q-fin.GN": "General Finance",
    "q-fin.MF": "Mathematical Finance",
    "q-fin.PM": "Portfolio Management",
    "q-fin.PR": "Pricing of Securities",
    "q-fin.RM": "Risk Management",
    "q-fin.TR": "Trading and Market Microstructure",
    "stat.AP": "Applications",
    "stat.CO": "Computation",
    "stat.ME": "Methodology",
    "stat.ML": "Machine Learning",
    "stat.TH": "Statistics Theory"
}

# if __name__ == "__main__":
#     title = input("Enter the paper title:\n")
#     abstract = input("Enter the abstract:\n")

#     predicted = predict_categories(title, abstract)

#     print("\nPredicted Categories:")
#     for category_list in predicted:
#         for category in category_list:
#             full_form = arxiv_categories.get(category, "Unknown Category")
#             print(f"- {category}: {full_form}")
