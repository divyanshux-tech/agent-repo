import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

def index_corpus():
    data_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    chunks_path = os.path.join(data_dir, "knowledge_chunks.json")
    embeddings_path = os.path.join(data_dir, "embeddings.npy")
    ids_path = os.path.join(data_dir, "chunk_ids.json")
    
    if not os.path.exists(chunks_path):
        print(f"File not found: {chunks_path}")
        return
        
    with open(chunks_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    chunks = data.get("chunks", [])
    if not chunks:
        print("No chunks found to index.")
        return
        
    print(f"Loaded {len(chunks)} chunks. Initializing model...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    
    texts_to_embed = []
    chunk_ids = []
    
    for chunk in chunks:
        # Construct a rich text representation for better embedding
        text = f"Destination: {chunk['destination']}. {chunk['content']}"
        texts_to_embed.append(text)
        chunk_ids.append(chunk["id"])
        
    print(f"Generating embeddings for {len(texts_to_embed)} texts...")
    embeddings = model.encode(texts_to_embed, show_progress_bar=True)
    
    # Save the numpy array
    np.save(embeddings_path, embeddings)
    
    # Save the id mapping
    with open(ids_path, "w", encoding="utf-8") as f:
        json.dump(chunk_ids, f, indent=2)
        
    print(f"Successfully saved embeddings to {embeddings_path}")
    print(f"Successfully saved chunk IDs to {ids_path}")

if __name__ == "__main__":
    index_corpus()
