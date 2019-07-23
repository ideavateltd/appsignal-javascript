const FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/
const CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m
const SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/

type StackFrame = {}

/**
 * This code is adapted from https://github.com/stacktracejs/error-stack-parser
 */
class StackParser {
  /**
   * Given an Error object, extract the most information from it.
   *
   * @param {Error} error object
   * @return {Array} of StackFrames
   */
  public static parse(error: Error): StackFrame[] {
    if (
      typeof (error as any).stacktrace !== "undefined" ||
      typeof (error as any)["opera#sourceloc"] !== "undefined"
    ) {
      return this.parseOpera(error)
    } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
      return this.parseV8OrIE(error)
    } else if (error.stack) {
      return this.parseFFOrSafari(error)
    } else {
      throw new Error("Cannot parse given Error object")
    }
  }

  // Separate line and column numbers from a string of the form: (URI:Line:Column)
  public static extractLocation(urlLike) {
    // Fail-fast but return locations like "(native)"
    if (urlLike.indexOf(":") === -1) {
      return [urlLike]
    }

    const regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/
    const parts = regExp.exec(urlLike.replace(/[\(\)]/g, "")) || []
    return [parts[1], parts[2] || undefined, parts[3] || undefined]
  }

  public static parseV8OrIE(error): StackFrame[] {
    const filtered = error.stack.split("\n").filter(line => {
      return !!line.match(CHROME_IE_STACK_REGEXP)
    })

    return filtered.map(line => {
      if (line.indexOf("(eval ") > -1) {
        // Throw away eval information until we implement stacktrace.js/stackframe#8
        line = line
          .replace(/eval code/g, "eval")
          .replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, "")
      }
      const tokens = line
        .replace(/^\s+/, "")
        .replace(/\(eval code/g, "(")
        .split(/\s+/)
        .slice(1)

      const locationParts = this.extractLocation(tokens.pop())
      const functionName = tokens.join(" ") || undefined
      const fileName =
        ["eval", "<anonymous>"].indexOf(locationParts[0]) > -1
          ? undefined
          : locationParts[0]

      return {
        functionName: functionName,
        fileName: fileName,
        lineNumber: locationParts[1],
        columnNumber: locationParts[2],
        source: line
      }
    })
  }

  public static parseFFOrSafari(error) {
    const filtered = error.stack.split("\n").filter(line => {
      return !line.match(SAFARI_NATIVE_CODE_REGEXP)
    })

    return filtered.map(line => {
      // Throw away eval information until we implement stacktrace.js/stackframe#8
      if (line.indexOf(" > eval") > -1) {
        line = line.replace(
          / line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g,
          ":$1"
        )
      }

      if (line.indexOf("@") === -1 && line.indexOf(":") === -1) {
        // Safari eval frames only have function names and nothing else
        return {
          functionName: line
        }
      } else {
        const functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/
        const matches = line.match(functionNameRegex)
        const functionName = matches && matches[1] ? matches[1] : undefined
        const locationParts = this.extractLocation(
          line.replace(functionNameRegex, "")
        )

        return {
          functionName: functionName,
          fileName: locationParts[0],
          lineNumber: locationParts[1],
          columnNumber: locationParts[2],
          source: line
        }
      }
    })
  }

  public static parseOpera(e) {
    if (
      !e.stacktrace ||
      (e.message.indexOf("\n") > -1 &&
        e.message.split("\n").length > e.stacktrace.split("\n").length)
    ) {
      return this.parseOpera9(e)
    } else if (!e.stack) {
      return this.parseOpera10(e)
    } else {
      return this.parseOpera11(e)
    }
  }

  public static parseOpera9(e) {
    const lineRE = /Line (\d+).*script (?:in )?(\S+)/i
    const lines = e.message.split("\n")
    const result = []

    for (let i = 2, len = lines.length; i < len; i += 2) {
      const match = lineRE.exec(lines[i])

      if (match) {
        result.push({
          fileName: match[2],
          lineNumber: match[1],
          source: lines[i]
        })
      }
    }

    return result
  }

  public static parseOpera10(e) {
    const lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i
    const lines = e.stacktrace.split("\n")
    const result = []

    for (let i = 0, len = lines.length; i < len; i += 2) {
      const match = lineRE.exec(lines[i])

      if (match) {
        result.push({
          functionName: match[3] || undefined,
          fileName: match[2],
          lineNumber: match[1],
          source: lines[i]
        })
      }
    }

    return result
  }

  // Opera 10.65+ Error.stack very similar to FF/Safari
  public static parseOpera11(error) {
    const filtered = error.stack.split("\n").filter(line => {
      return (
        !!line.match(FIREFOX_SAFARI_STACK_REGEXP) &&
        !line.match(/^Error created at/)
      )
    })

    return filtered.map(line => {
      const tokens = line.split("@")
      const locationParts = this.extractLocation(tokens.pop())
      const functionCall = tokens.shift() || ""
      const functionName =
        functionCall
          .replace(/<anonymous function(: (\w+))?>/, "$2")
          .replace(/\([^\)]*\)/g, "") || undefined

      let argsRaw

      if (functionCall.match(/\(([^\)]*)\)/)) {
        argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, "$1")
      }

      const args =
        argsRaw === undefined || argsRaw === "[arguments not available]"
          ? undefined
          : argsRaw.split(",")

      return {
        functionName: functionName,
        args: args,
        fileName: locationParts[0],
        lineNumber: locationParts[1],
        columnNumber: locationParts[2],
        source: line
      }
    })
  }
}

/**
 * Get backtrace from an `Error` object, or an error-like object
 *
 * @param   {Error | T}     error      An `Error` object or an error-like object
 *
 * @return  {string[]}                 A backtrace
 */
export function getStacktrace<T extends Error>(error: Error | T): string[] {
  if (error instanceof Error) {
    try {
      const frames = StackParser.parse(error)
      return frames.map(f => f.source || "")
    } catch (e) {
      // probably IE9 or another browser where we can't get a stack
      return ["No stacktrace available"]
    }
  } else {
    // a plain object that resembles an error
    const { stack = "" } = error
    return stack.split("\n").filter(line => line !== "")
  }
}
