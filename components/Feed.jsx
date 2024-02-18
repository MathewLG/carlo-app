'use client'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import MemoryCard from './MemoryCard';
import { useState, useEffect} from 'react'

const MemoryCardList = ({ data, handleTagClick }) => {
  return (
    <div className='mt-16 prompt_layout'>
      {data.map((memory) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          handleTagClick={handleTagClick}
        />
      ))}
    </div>
  )
}

const Feed = () => {
  const [searchText, setSearchText] = useState('');
  const [memories, setMemories] = useState([])
  const handleSearchChange = (e) => {

  }

  useEffect(() => {
    const fetchMemories = async () => {
      const response = await fetch('/api/memory');
      const data = await response.json();
      setMemories(data)
    }
    fetchMemories();
  }, []);

  return (
    <section className='feed'>
      <form className='relative w-full flex-center'>
        <input
          type="text"
          placeholder='Buscar un recuerdo'
          value={searchText}
          onChange={handleSearchChange}
          required
          className="search_input peer"
        />
      </form>

    <MemoryCardList
      data={memories}
      handleTagClick={() => {}}
    />

    </section>
  )
}

export default Feed