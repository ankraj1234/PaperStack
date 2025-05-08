from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from crewai import Agent, Task, Crew
from crewai import LLM
import os
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv() 

# Assume the Agent and Task classes and your custom class (e.g., MetadataProcessor) are defined/imported

# === Input Schema ===
class PaperMetadata(BaseModel):
    title: str
    abstract: str
    keywords: List[str]
    authors: List[Dict[str, str]]
    publication_date: str

os.environ['GROQ_API_KEY'] = "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"

# === Init your processor ===
class MetadataProcessor:
    def __init__(self):
        # use your actual LLM here
        self.llm = ChatGroq(
                model="groq/gemma2-9b-it",
                api_key=os.getenv("GROQ_API_KEY")
            )

    def metadata_cleaning_agent(self):
        return Agent(
            role="Academic Metadata Sanitizer",
            goal="""
                You are an expert in cleaning and sanitizing research paper metadata for scholarly use.
                Your job is to remove irrelevant, non-academic, or redundant content from fields such as title, abstract, and author list—while preserving the structure and scholarly integrity.

                You must:
                - Clean titles by removing legal or attribution disclaimers.
                - Clean abstracts by removing:
                  - Author contribution notes
                  - Legal notices or licensing lines
                  - Footnotes (*, †, ‡), unless essential
                - Clean authors list by removing organizations or departments posing as author names.

                Keep the output JSON structure intact. Ensure the cleaned metadata is valid for indexing in platforms like Google Scholar or Semantic Scholar.
            """,
            backstory="""
                As a Metadata Sanitizer, you are responsible for refining and preparing academic paper data for use in scholarly indexing systems. 
                You excel at identifying and stripping away noise while preserving meaningful and accurate information.
            """,
            verbose=True,
            llm=self.llm,  # Or self.openai_llm depending on your stack
            max_iter=2,
        )

    def metadata_cleaning_task(self, agent, input_paper_json: dict):
        return Task(
            description=f"""
                You are given a JSON object containing research paper metadata. Your task is to clean it by:
                - Removing legal disclaimers or publishing rights from the title.
                - Removing irrelevant content from the abstract, such as:
                  - Licensing and contribution notes
                  - Legal disclaimers (e.g., "Provided proper attribution is provided...")
                  - Author footnotes (*, †, ‡), unless absolutely necessary
                - Removing non-person entities from the author list (e.g., institutions like "Google Brain", "MIT Media Lab", other ).

                You must not:
                - Change the layout or structure of the fields
                - Add or infer content not present in the original

                Use the same keys and data structure as in the original input. Only clean the values.

                Input Paper Metadata:
                ```json
                {input_paper_json}
                ```

                **Expected Output Format:**
                ```
                {{
                  "title": "Cleaned title",
                  "abstract": "Cleaned abstract",
                  "keywords": [],
                  "authors": [
                    {{"name": "Author Name"}},
                    ...
                  ],
                  "publication_date": "YYYY-MM-DD"
                }}
                ```
            """,
            agent=agent,
            expected_output="[Cleaned JSON-formatted metadata]",
            async_execution=False,
        )

processor = MetadataProcessor()

input_paper_json = '''{
  "title": "Provided proper attribution is provided, Google hereby grants permission to reproduce the tables and figures in this paper solely for use in journalistic or scholarly works. Attention Is All You Need",
  "abstract": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 Englishto-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.* Equal contribution. Listing order is random. Jakob proposed replacing RNNs with self-attention and started the effort to evaluate this idea. Ashish, with Illia, designed and implemented the first Transformer models and has been crucially involved in every aspect of this work. Noam proposed scaled dot-product attention, multi-head attention and the parameter-free position representation and became the other person involved in nearly every detail. Niki designed, implemented, tuned and evaluated countless model variants in our original codebase and tensor2tensor. Llion also experimented with novel model variants, was responsible for our initial codebase, and efficient inference and visualizations. Lukasz and Aidan spent countless long days designing various parts of and implementing tensor2tensor, replacing our earlier codebase, greatly improving results and massively accelerating our research.† Work performed while at Google Brain.‡ Work performed while at Google Research.",
  "keywords": [],
  "authors": [
    {
      "name": "Ashish Vaswani"
    },
    {
      "name": "Noam Shazeer"
    },
    {
      "name": "Google Brain"
    },
    {
      "name": "Niki Parmar"
    },
    {
      "name": "Jakob Uszkoreit"
    },
    {
      "name": "Llion Jones"
    },
    {
      "name": "Aidan N Gomez"
    },
    {
      "name": "Łukasz Kaiser"
    }
  ],
  "publication_date": "2023-08-02"
}'''

def clean_metadata(paper: PaperMetadata):
    try:
        agent = processor.metadata_cleaning_agent()
        task = processor.metadata_cleaning_task(agent, input_paper_json)  #paper.dict()
        crew = Crew(agents=[agent], tasks = [task], verbose = False)
        return crew.kickoff().raw
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

clean_metadata(input_paper_json)
