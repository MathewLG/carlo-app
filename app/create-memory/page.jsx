'use client';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import Form from '@components/Form';

const CreateMemory = () => {
  const router = useRouter();
  const {data : session} = useSession();
  const [submitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState({
    memory: "", 
    tag: "",
  });
  const createMemory = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try{
        const response = await fetch('/api/memory/new',{
            method: 'POST', 
            body: JSON.stringify({
                memory: post.memory, 
                userId: session?.user.id, 
                tag: post.tag,
            }),
        });

        if(response.ok) {
            router.push("/");
        }

    }catch (error){
        console.log(error);
    } finally {
        setIsSubmitting(false);
    }

  }
  return (
    <Form
      type="Agregar"
      post={post}
      setPost={setPost}
      submitting={submitting}
      handleSubmit={createMemory}
    />
  );
};

export default CreateMemory