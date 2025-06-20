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

from crewai import Agent, Task

class ContextAnswererCrew:
    def __init__(self):
        self.llm = ChatGroq(
            model="groq/gemma2-9b-it",
            api_key=GROQ_API_KEY
        ) 

    def context_answering_agent(self):
        return Agent(
            role="Academic Context Answerer",
            goal="""
                Your primary objective is to accurately and clearly answer academic questions 
                or explain excerpts from research papers. Use the two most relevant sections 
                of the provided paper to support your response.

                - If the input is a pasted section from a paper, explain it in clear, plain language 
                that is intuitive and easy to understand.

                - If the input is a question, use the two most relevant sections to construct a thoughtful, 
                well-supported answer, focusing on explaining the question.

                - If the provided sections are not clearly related to the query, ask the user to provide 
                a more relevant reference.

                If you're able to answer the question, do so, and always suggest that the original paper 
                may offer further clarity or depth.
            """,
            backstory="""
                You are a highly capable academic assistant designed to interpret and clarify complex research content. 
                Whether the user provides a confusing passage or poses a question about a paper, you distill the 
                most relevant information into clear, accessible explanations. Your responses are grounded in context, 
                concise, and always aim to deepen the user's understanding.
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
                You are given a **user query** and the **two most relevant sections** of a research paper, 
                each accompanied by a similarity score.

                Your task is to:
                - Answer the user's query clearly and accurately, using the information from the provided sections.
                - If the query is a **pasted excerpt from the paper**, explain it thoroughly in simple, accessible language.
                - Explicitly reference information from the sections wherever relevant.
                - If the sections do not align well with the query, attempt to answer based on your understanding, 
                but request a more appropriate reference from the user.

                ---  
                **User Query**:
                ```
                {query}
                ```

                **Top Matching Sections**:
                {section_descriptions}
                ---

                Your response should be clear, well-structured, and grounded in the provided context. 
                Avoid using knowledge beyond what's given in the sections unless necessary for clarity.
            """,
            agent=agent,
            expected_output="A clear, detailed explanation or answer based on the two most relevant sections and the user's query.",
            async_execution=False,
        )

    
context_crew = ContextAnswererCrew()

def answer_user_query(query, top_sections):
    try:
        agent = context_crew.context_answering_agent()
        task = context_crew.context_answering_task(agent, query=query, top_sections=top_sections)
        answering_crew = Crew(agents=[agent], tasks=[task], verbose=False)
        answer_result = answering_crew.kickoff()
        return answer_result.raw
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))