
import './App.css'
import {Show, SignInButton, SignOutButton,UserButton,} from "@clerk/react"

function App() {

  return (
    <>
    <h1>welcome to my app</h1>
      <Show when="signed-out">
        <SignInButton mode="modal"> 
          Please sign In
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <SignOutButton />
      </Show>
      <UserButton />
    </>
  )
}

export default App
