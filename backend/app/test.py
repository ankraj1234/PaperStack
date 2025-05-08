from utils.keyword_extraction import extract_keyword

text = "A Model for Auto-Tagging of Research Papers based on Keyphrase Extraction Methods. Tagging provides a convenient means to assign tokens of identification to research papers which facilitate recommendation, search and disposition process of research papers. This paper contributes a document centered approach for auto-tagging of research papers. The auto-tagging method mainly comprises of two processes: classification and tag selection. The classification process involves automatic keyword extraction using Rapid Automatic Keyword Extraction (RAKE) algorithm which uses the keyword -score matrix."

print(extract_keyword(text))