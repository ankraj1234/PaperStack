from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from crewai import Agent, Task, Crew
from crewai import LLM
import os
import json
from langchain_groq import ChatGroq

os.environ['GROQ_API_KEY'] = "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" #Add groq API here

from crewai import Agent, Task

class ContextAnswererCrew:
    def __init__(self):
        self.llm = ChatGroq(
            model="groq/gemma2-9b-it",
            api_key=os.getenv("GROQ_API_KEY")
        ) 

    def context_answering_agent(self):
        return Agent(
            role="Academic Context Answerer",
            goal="""
                Your objective is to accurately and clearly answer academic questions or explain pasted text from research papers using the two most relevant sections of the paper provided.
                If the query is a pasted section, your job is to explain it in detail in plain, intuitive terms.
                Otherwise, try to answer the question using the two given sections and their context.
            """,
            backstory="""
                You are a seasoned academic assistant skilled at breaking down complex research content. You help users understand specific sections of papers or answer their questions using relevant excerpts.
                You are particularly helpful when the user copy-pastes something confusing—they're counting on you to de-jargon it.
            """,
            verbose=True,
            llm=self.llm,
            max_iter=2,
        )

    def context_answering_task(self, agent, query: str, top_sections: List[Dict[str, Any]]):
        """
        top_sections: List of dicts with 'section_text' and 'similarity_score' fields.
        """
        section_descriptions = "\n\n".join([
            f"### Section (Score: {s['similarity_score']}):\n{s['text']}" for s in top_sections
        ])

        return Task(
            description=f"""
                You are given a **user query** and the **two most relevant sections** of a research paper along with their similarity scores.
                
                Your task is to:
                - Answer the user's query in a clear, well-structured way using the sections.
                - If the user pasted a section of the paper as the query, **explain it in great detail**, using simple, accessible language.
                - You must reference information from the provided sections explicitly where possible.

                User Query:
                ```
                {query}
                ```

                Top Matching Sections:
                {section_descriptions}

                Respond clearly and thoroughly. Do not assume external knowledge not present in the sections.
            """,
            agent=agent,
            expected_output="A detailed explanation or answer based on the two sections and the query.",
            async_execution=False,
        )
    
context_crew = ContextAnswererCrew()

def answer_user_query(query, top_sections):
    try:
        agent = context_crew.context_answering_agent()
        task = context_crew.context_answering_task(agent, query=query, top_sections=top_sections)
        answering_crew = Crew(agents=[agent], tasks=[task], verbose=False)
        answer_result = answering_crew.kickoff()
        # answer_result = json.loads(answer_result.raw)
        return answer_result.raw
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))