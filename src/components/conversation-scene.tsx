export function ConversationScene() {
  return <div className="conversation-scene" role="img" aria-label="Two people chatting in Gujarati: Kem cho? — How are you? Hu majama chhu. — I am well.">
    <div className="scene-orbit" aria-hidden />
    <span className="scene-spark" aria-hidden>✳</span>
    <div className="scene-speech greeting" aria-hidden><p lang="gu">કેમ છો?</p><strong>Kem cho?</strong><span>How are you?</span></div>
    <div className="scene-speech reply" aria-hidden><p lang="gu">હું મજામાં છું.</p><strong>Hu majama chhu.</strong><span>I am well.</span></div>
    <svg className="conversation-people" viewBox="0 0 500 420" fill="none" aria-hidden="true">
      <ellipse cx="250" cy="385" rx="208" ry="17" fill="#26344A" opacity=".07" />
      <path d="M48 378C46 287 66 248 132 246C193 244 224 289 216 378Z" fill="#38BFA7" />
      <path d="M96 257L122 295L150 254" fill="#FFF8ED" />
      <path d="M110 232V262C118 276 141 274 149 259V222" fill="#CC774F" />
      <path d="M84 180C71 118 89 86 132 82C180 79 193 125 181 181" fill="#26344A" />
      <ellipse cx="133" cy="177" rx="48" ry="63" fill="#E6A477" />
      <path d="M85 155C106 155 135 133 145 110C149 132 165 145 181 150V110L145 91L99 101Z" fill="#26344A" />
      <path d="M115 169V176M151 167V174" stroke="#26344A" strokeWidth="5" strokeLinecap="round" />
      <path d="M124 198C130 205 139 205 145 197" stroke="#26344A" strokeWidth="4" strokeLinecap="round" />
      <path d="M92 334L86 377M178 327L186 377" stroke="#167363" strokeWidth="4" strokeLinecap="round" />
      <path d="M283 378C272 294 311 254 367 253C427 252 457 294 454 378Z" fill="#FF765E" />
      <path d="M344 240V270C356 289 380 285 389 268V230" fill="#B76E4E" />
      <path d="M313 173C296 113 315 74 364 74C416 74 429 120 417 175L423 257L306 252Z" fill="#26344A" />
      <ellipse cx="365" cy="178" rx="48" ry="63" fill="#D98F65" />
      <path d="M317 151C339 142 357 123 364 106C374 128 395 143 415 148L405 104L354 83L320 112Z" fill="#26344A" />
      <path d="M347 172V179M381 169V176" stroke="#26344A" strokeWidth="5" strokeLinecap="round" />
      <path d="M354 201C361 208 373 207 380 198" stroke="#26344A" strokeWidth="4" strokeLinecap="round" />
      <circle cx="320" cy="195" r="5" fill="#FFC857" /><circle cx="410" cy="194" r="5" fill="#FFC857" />
      <path d="M324 333L316 377M412 329L418 377" stroke="#B44735" strokeWidth="4" strokeLinecap="round" />
      <path d="M201 298C232 327 257 326 291 299" stroke="#26344A" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 8" />
      <path d="M240 276L246 262L253 278L268 279L257 290L260 305L247 298L233 305L236 289L226 279Z" fill="#FFC857" />
    </svg>
    <span className="scene-caption" aria-hidden>Good conversations start small.</span>
  </div>;
}
