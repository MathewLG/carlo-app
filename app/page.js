
import Feed from '@components/Feed'
const Home = () => {
  return (
    <section className="w-full flex-center flex-col">
      <h1 className="head_text text-center">
        Carlo-App
        <br />
        <span className="mt-5 text-5x1 font-extrabold  bg-gradient-to-r from-sky-900 via-blue-400 to-indigo-500 bg-clip-text text-transparent">
          Compartiendo recuerdos
          </span>
        </h1> 
        <p className="desc text-center">
          Carlo-App es una aplicación en la que puedes almacenar los momentos importantes con tu bebé de manera segura. Tú y sus seres queridos pueden enviarle mensajes mientras crece y darle acceso para leerlos cuando creas que es el momento adecuado. 
        </p>
        <Feed/>
    </section>
  )
}

export default Home