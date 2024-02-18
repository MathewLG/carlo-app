import Link from 'next/link';

const Form = ({type,post,setPost,submitting,handleSubmit
}) => {
  return (
    <section className='w-full max-w-full flex-start flex-col'>
      <h1 className='head_text text-left'>
        <span className='blue_gradient'>{type} Recuerdos</span>
      </h1>
      <p className='desc text-left max-w-md'>
        {type} y comparte recuerdos con el Carlo del futuro.  
      </p>
      <form
        onSubmit={handleSubmit}
        className='mt-10 w-full max-w-2xl flex flex-col gap-7 glassmorphism'
      >
        <label>
          <span className='font-satoshi font-semibold text-base text-gray-700' >
            Tu recuerdo con Carlo
          </span>
        
          <textarea
            value={post.memory}
            onChange={(e) => setPost({...post,
            memory: e.target.value})}
            placeholder='Escribe tu mensaje aquí'
            required
            className='form_textarea'
          />
        </label>

        <label>
          <span className='font-satoshi font-semibold text-base text-gray-700' >
            Categoria { ` `}
            <span className='font-normal'>(#mensaje, #recuerdo )</span>
          </span>
        
          <input
            value={post.tag}
            onChange={(e) => setPost({...post,
            tag: e.target.value})}
            placeholder='#categoria'
            required
            className='form_input'
          />
        </label>
        <div className='flex-end mx-3 mb-5 gap-4'>
          <Link href="/" className='text-gray-500 text-sm'>
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-1.5 text-sm bg-primary-orange rounded-full text-white"
          >
            {submitting? `{type}...` : type}

          </button>
        </div>
      </form>
    </section>
  )
}

export default Form