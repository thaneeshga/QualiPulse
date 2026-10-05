import { Component, ReactNode } from 'react'
export default class ErrorBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(e:Error){console.error('Screen error:',e)}
 render(){return this.state.failed
  ?<div className="p-10" role="alert"><p className="text-err font-semibold">Something went wrong while showing this screen.</p><p className="text-sm text-sec mt-1">Your saved data is safe. Reload the page to continue.</p><button onClick={()=>location.reload()} className="mt-3 px-3 py-1.5 rounded-lg bg-pc text-white font-semibold">Reload</button></div>
  :this.props.children}}
