from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from crewai import Agent, Task, Crew
from crewai import LLM
import os
import json
import sys
from langchain_groq import ChatGroq

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from config import GROQ_API_KEY

if not GROQ_API_KEY:
    raise EnvironmentError("GROQ_API_KEY not found in .env file")


from crewai import Agent, Task

class KeywordExtractorCrew:
    def __init__(self):
        self.llm = ChatGroq(
            model="groq/gemma2-9b-it",
            api_key=os.environ['GROQ_API_KEY']
            # api_key=GROQ_API_KEY
        ) 

    def keyword_extraction_agent(self):
        return Agent(
            role="Academic Keyword Extractor",
            goal="""
                You are an expert in identifying and extracting the most important keywords from academic text, such as abstracts, introductions, or full papers.
                Your objective is to extract exactly 3 high-quality, domain-relevant keywords or keyphrases.
                Rank them by decreasing importance based on context, domain relevance, and thematic centrality.
            """,
            backstory="""
                As a Keyword Extractor, your job is to identify the most meaningful and relevant terms or phrases that represent the core ideas in academic writing.
                You are skilled in filtering out general or vague terms and instead highlighting specialized vocabulary.
            """,
            verbose=True,
            llm=self.llm,
            max_iter=2,
        )

    def keyword_extraction_task(self, agent, input_text: str):
        return Task(
            description=f"""
                Given the following academic text (e.g., an abstract), extract exactly 3 keywords or keyphrases that best capture its central themes.

                - The keywords must be sorted in **decreasing order of importance**.
                - Avoid general or overly broad terms like "study", "research", or "method".
                - Focus on meaningful technical or topical terms.
                - You may use multi-word keyphrases (e.g., "convolutional neural networks") but try to keep it short
                - Avoid repetative keywords (e.g. cnn and convolutional neural network) 
                - if standard abbreviations exist use then in caps

                Return the keywords as a simple JSON list of strings like this:
                ```json
                ["most important keyword", "second keyword", "third keyword"]
                ```

                Input Academic Text:
                ```
                {input_text}
                ```
            """,
            agent=agent,
            expected_output='["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]',
            async_execution=False,
        )


keyword_crew = KeywordExtractorCrew()

def extract_keyword(text):
    try:
        agent = keyword_crew.keyword_extraction_agent()
        task = keyword_crew.keyword_extraction_task(agent, input_text=text)
        extraction_crew = Crew(agents=[agent], tasks=[task], verbose=False)
        keywords_result = extraction_crew.kickoff()
        keywords_array = json.loads(keywords_result.raw)
        return keywords_array
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
