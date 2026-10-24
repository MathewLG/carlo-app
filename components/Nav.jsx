"use client";
import Link from 'next/link';
import Image from 'next/image';
import {useState, useEffect} from 'react';
import {signIn, signOut, useSession, getProviders} from 'next-auth/react';


const Nav = () => {
  const { data: session } = useSession();
  const [providers, setProviders] = useState(null);
  const [toggleDropdown, settoggleDropdown] = useState(false);

  useEffect(() => {
    const setUpProviders = async () => {
      const response = await getProviders();

      setProviders(response);
    }

    setUpProviders();
  }, [])

  return (
    <nav className="flex-between w-full mb-16 pt-3">
      <Link href="/" className="flex gap-2 flex-center">
        <Image 
          src="/assets/images/carlo-app.png"
          alt="Carlo-App Logo"
          width={30}
          height={30}
          className="object-contain"
        />
        <p className="logo_text">Carlo-App</p>
      </Link>
      {/* Desktop Navigation */}
      <div className="sm:flex hidden">
        {session?.user ? (
          <div className="flex gap-3 md:gap-5">
            <Link href="/create-memory"
            className="black_btn">
              Agregar nuevo recuerdo
            </Link>
            <button type="button" onClick={() => signOut()} className="outline_btn">
              Cerrar Sesión
            </button>
            {/* TODO: link to /profile once the profile page exists */}
            <Image
              src={session?.user.image}
              width={37}
              height={37}
              className="rounded-full"
              alt=""
            />
          </div>
        ): (
          <>
          {
            providers && 
            Object.values(providers).map((provider) => (
              <button 
              type="button"
              key={provider.name}
              onClick={() => signIn(provider.id)}
              className='black_btn'
              >
                Iniciar Sesión
              </button>
            ))
          }
          </>
        )}

      </div>
      {/* Mobile Navigation */}
      <div className="sm:hidden flex relative">
        {session?.user ? (
          <div className="flex">
              <button
                type="button"
                aria-label="Abrir menú"
                aria-expanded={toggleDropdown}
                onClick={() => settoggleDropdown((prev) => !prev)}
              >
                <Image
                  src={session?.user.image}
                  width={37}
                  height={37}
                  className="rounded-full"
                  alt=""
                />
              </button>
              {toggleDropdown && (
                <div className="dropdown">
                  <Link
                    href="/create-memory"
                    className="dropdown_link"
                    onClick={() => settoggleDropdown(false)}
                  >
                    Agregar recuerdo
                  </Link>
                  <button
                    type="button"
                    onClick={() => {settoggleDropdown(false);
                    signOut()

                    }}
                    className="mt-5 w-full black_btn"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              )}
          </div>
        ): (
          <>
          {
            providers && 
            Object.values(providers).map((provider) => (
              <button 
              type="button"
              key={provider.name}
              onClick={() => signIn(provider.id)}
              className='black_btn'
              >
                Iniciar Sesión
              </button>
            ))
          }
          </>
        )}
      </div>
    </nav>
  )
}

export default Nav