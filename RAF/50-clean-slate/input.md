- [ ] in task status when execution is says "● 1-pen-size-adjustment (sonnet, low) 1m 5s" for sonnet reasoning effort is not specified in the config (    "low": {
      "model": "sonnet",
      "harness": "claude"
    }, when reasoning effort falsy -> don't output it at all. just (sonnet)
