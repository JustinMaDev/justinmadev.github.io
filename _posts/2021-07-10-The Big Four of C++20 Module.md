---
layout: post
title: "The Big Four of C++20: Module"
lang: en
---

# Preface

**What is the most significant feature of C++20?**  
—The most significant feature is that, to date, no compiler has fully implemented all its features.  

![](/assets/images/20210710_1.png)  
<!--more--> 

The C++20 standard was finalized long ago, and major compilers have already adopted most of its features. However, as of **July 2021**, no compiler has achieved complete support for all C++20 features. Some argue that C++20 represents the largest overhaul since C++11—perhaps even surpassing it in scope.  

This article focuses solely on **modules**, one of the four major features introduced in C++20. It is divided into three chapters:  
1. **The Origins and Trade-offs of C++'s Compilation and Linking Model**: Exploring the historical rationale and limitations of the traditional model.  
2. **Using C++20 Modules**: A practical guide to adopting the module mechanism.  
3. **Behind the Scenes of Modules**: Analyzing their inner workings, pros and cons, and current compiler support status.  



# (I) The Origins of Header Files

**1. C++ Inherits from C**: It not only adopted C's syntax but also inherited its compilation and linking model.  
**2. Early 1973: C Takes Shape**:  The C language stabilized with features like preprocessing and struct support. The compilation model (preprocess → compile → assemble → link) was established and remains unchanged. In 1973, **K&R rewrote the Unix kernel in C**, cementing the language's practicality.  
**3. Why Preprocessing? Why Header Files?**  
**4. Hardware Constraints of the 1970s**:  The **PDP-11** (the machine used to run early C compilers) had: **Memory**: 64 KiB **Storage**: 512 KiB. To accommodate these limitations, C compilers were designed for **modular compilation**:  Split source code into smaller files for one-pass compilation (scan once, generate object code immediately, no backtracking). Link object files into a final executable.  
>   **One-pass compilation** led to key C language traits:  
>   - **A. Structs Must Be Defined Before Use**: To determine member types/offsets for code generation.  
>   - **B. Local Variables Declared First**: Required to allocate stack space upfront.  
>   - **C. External Variables**: Only declarations (name + type) are needed; addresses resolved by the linker.  
>   - **D. External Functions**: Declarations (name + signature) suffice; addresses resolved by the linker. 

**5. Header Files & Preprocessing**:  Header files provided **declarations** (function prototypes, structs) in a minimal format. Preprocessing expanded headers into source files, enabling seamless one-pass compilation.  

---

### **The Dark Side of Header Files**  
While essential, headers introduced significant drawbacks:  
1. **Inefficiency**: Headers perform **textual inclusion** (no syntax filtering), bloating source files with unused declarations.  
2. **Transitive Pollution**: Macros/variables in deeply nested headers can "leak" upward via intermediate includes.  
3. **Slow Compilation**: If `a.h` is included by three modules, it is expanded and parsed **three times**.  
4. **Order Sensitivity**: Program behavior depends on header inclusion order (especially critical for C++ overload resolution).  
5. **Non-Determinism**: The same header may behave differently across source files due to:  
>   - Other included headers.  
>   - Macro definitions in the source.  
>   - Compiler flags.  
6. **Interface-Implementation Split**: Headers enforce separation of declarations (.h) and implementations (.cpp), promoting modular design but risking inconsistencies.  

---

**C++20 Modules** aim to address these issues. We'll first explore their usage and then analyze how they improve upon headers.  

# (II) Using Modules

###### 2.1 Implementing a Minimal Module  
**module_hello.cppm**: Defines a complete **hello** module and exports the **say_hello_to** function. Current compilers don't enforce module file extensions; we use **.cppm** here. This file is called a **module interface file** and can contain both declarations and definitions.  

~~~cpp
// module_hello.cppm
export module hello;
import <iostream>;
import <string_view>;

void internal_helper() { /* ... */ }

export void say_hello_to(const std::string_view& something) {
    internal_helper();
    std::cout << "Hello " << something << "!\n";
}
~~~

**main.cpp** uses the module directly: 

~~~cpp
// main.cpp
import hello;
import <string_view>;

int main() {
    say_hello_to(std::string_view{"Netease"});
    internal_helper();  // Error: not exported
    return 0;
}
~~~

**Compilation script**:  
~~~sh
# buildfile.sh
CXX="clang++ -fmodules-ts -std=c++2a"
$CXX -o module_hello.pcm --precompile -x c++-module module_hello.cppm
$CXX -o hello -fprebuilt-module-path=. main.cpp module_hello.cpp
~~~

**Key details**:  
> * `export module hello;` declares a module interface file. Only interface files can export entities.  
> * Add `export` before functions/classes to expose them.  
> * `import hello;` uses the **module name**, not the filename.  
> * Imports are **not transitive** (e.g., `string_view` must be re-imported in `main.cpp`).  
> * Imports must follow the module declaration but precede other code.  
> * Compile modules bottom-up (base modules first).  
> * The `.pcm` file contains exported symbols for linkage.  

---

###### 2.2 Interface-Implementation Separation  
For larger modules, split declarations and implementations:  

**module_hello.cppm** (interface):  

~~~cpp
export module hello;
import <iostream>;
import <string_view>;

void internal_helper();  // Internal helper (not exported)
export void say_hello_to(const std::string_view&);
export auto square(const auto& x) { return x * x; }  // Function template (must stay in interface)
export void func_a();
export void func_b();
~~~

**module_hello.cpp** (implementation): 

~~~cpp
module hello;
void internal_helper() { /* ... */ }

void say_hello_to(const std::string_view& something) {
    internal_helper();
    std::cout << "Hello " << something << "!\n";
}

void func_a() { /* ... */ }
void func_b() { /* ... */ }
~~~

**Rules**:  
> * Split into **interface** (`export module`) and **implementation** (`module`) files.  
> * Implementation files **cannot** export entities.  
> * Function templates (e.g., `square`) must be defined in the interface.  

---

###### 2.3 Visibility Control  
To expose dependencies transitively, use `export import`:  

~~~cpp
// module_hello.cppm
export module hello;
export import <string_view>;  // Expose to users
~~~

**main.cpp** no longer needs `<string_view>`:  
~~~cpp
import hello;
int main() {
    say_hello_to("Netease");  // Implicitly uses exported <string_view>
}
~~~

---

###### 2.4 Submodules  
Organize large modules hierarchically:  

**module_hello.cppm** (aggregates submodules):  

~~~cpp
export module hello;
export import hello.sub_a;
export import hello.sub_b;
~~~

**Submodule interface (hello.sub_a)**:  

~~~cpp
// module_hello_sub_a.cppm
export module hello.sub_a;
export void func_a();
~~~

**Submodule implementation**:  

~~~cpp
// module_hello_sub_a.cpp
module hello.sub_a;
void func_a() { /* ... */ }
~~~

**Key notes**:  
> * Submodules (e.g., `hello.sub_a`) are independent modules.  
> * The dot (`.`) in names is purely semantic (no hierarchical ownership).  

---

###### 2.5 Module Partitions  
Split modules internally using **partitions**:  

**Implementation Partition** (split implementation logic):  

~~~cpp
// module_hello_partition_internal.cpp
module hello:internal;
void internal_helper() { /* ... */ }
~~~

**Primary module implementation**:  

~~~cpp
// module_hello.cpp
module hello;
import :internal;  // Import partition

void func_a() { internal_helper(); /* ... */ }
void func_b() { internal_helper(); /* ... */ }
~~~

**Interface Partition** (split declarations):  

~~~cpp
// module_hello_partition_a.cppm
export module hello:partition_a;
export void func_a() { /* ... */ }
~~~

**Primary interface file**: 

~~~cpp
// module_hello.cppm
export module hello;
export :partition_a;
export :partition_b;
// export :internal;  // Error: cannot export implementation partitions
~~~

**Differences from submodules**:  
> * Partitions are **internal** (not visible externally).  
> * Partitions share the same module name.  

---

###### 2.6 Global Module Fragments  
Integrate legacy code using the global module:  

~~~cpp
module;  // Start global fragment
#include <cmath>  // Include non-module headers
#include <iostream>

export module hello;
export void func_a() { /* ... */ }
~~~

---

###### 2.7 Module Maps (Clang Example)  
Map traditional headers to modules via **module.modulemap**: 

~~~cpp
// module.modulemap
module A { header "a.h"; export *; }
module ctype { header "ctype.h"; export *; }
module iostream { header "iostream"; export *; }
~~~

**Compilation**:  

~~~sh
clang -cc1 -emit-module -o A.pcm -fmodules module.modulemap -fmodule-name=A
clang -cc1 -emit-module -o iostream.pcm -fmodules module.modulemap -fmodule-name=iostream
clang -cc1 -emit-obj main.cpp -fmodules -fmodule-map-file=module.modulemap \
    -fmodule-file=A=A.pcm -fmodule-file=iostream=iostream.pcm
~~~

**Notes**:  
> * Experimental feature with limited documentation.  
> * Macros and multi-file implementations may require special handling.  

---

###### 2.8 Modules vs. Namespaces  
Modules and namespaces are orthogonal concepts:
  
~~~cpp
// module_hello.cppm
export module hello;
export namespace hello {
    void say_hello() { std::cout << "hello\n"; }
}

// main.cpp
import hello;
int main() { hello::say_hello(); }
~~~

--- 

# (III) Summary

Finally, compared to the drawbacks of header files outlined earlier, modules offer these advantages:  
> * **No Redundant Compilation**:  
>   - Module interface/implementation files are compiled once into a `.pcm` file. Subsequent imports reuse this cached version, drastically improving build speeds.  
> * **Stronger Isolation**:  
>   - Module-internal imports do not leak externally unless explicitly exported via `export import`.  
> * **Order Independence**:  
>   - Import order of modules does not affect behavior.  
> * **Reduced Redundancy**:  
>   - Small modules can define and export entities in a single `.cppm` file. Larger modules still benefit from declaration/implementation separation.  
> * **Flexible Organization**:  
>   - Submodules and partitions enable scalable module architectures.  
> * **Legacy Compatibility**:  
>   - Global module fragments and module maps allow gradual migration from headers.  

---

### **Limitations of Modules**  
> * **Unstable Compiler Support**:  
>   - No compiler fully supports all C++20 module features (as of July 2021).  
> * **Build Dependency Management**:  
>   - Requires manual dependency ordering in build scripts.  
> * **Migration Complexity**:  
>   - Existing projects need significant restructuring; no mature build automation exists yet.  

---

### **What Modules Cannot Do**  
> * **Binary Distribution**:  
>   - Modules require source distribution (`.cppm`/`.pcm` files are compiler-specific).  
> * **Cross-Compiler Compatibility**:  
>   - `.pcm` (GCC/Clang) or `.ifc` (MSVC) files are not portable across compilers or compiler versions.  
> * **Auto-Build Systems**:  
>   - Manual build script configuration remains necessary.  

---

### **How Compilers Hide Module Internals**  
> * **Pre-Module Linkage**:  
>   - Symbols had *external* (cross-file) or *internal* (file-only) linkage controlled by `extern`/`static`.  
> * **Module Linkage**:  
>   - Symbols within a module (across partitions) share *module linkage*.  
> * **Name Mangling**:  
>   - Exported symbols use standard external linkage mangling.  
>   - Internal symbols are prefixed (e.g., `_Zw`) to prevent external linking.  

---

### **Compiler Support Status (July 2021)**  

|                     | GCC            | Clang          | Visual Studio  |  
|---------------------|----------------|----------------|----------------|  
| **Module Support**  | 11 (partial)   | 12 (partial)   | 19.28 (partial)|  
| **Module Maps**     | No data found  | 13             | No data found  |  
| **Cache File**      | `.pcm`         | `.pcm`         | `.ifc`         |  
| **Interface Files** | Unspecified    | Unspecified    | Unspecified    |  
| **Modularized STL** | Not available  | Not available  | Partial        |  

--- 

**Conclusion**:  
C++20 modules represent a paradigm shift in code organization, addressing long-standing header file issues. While adoption hurdles remain (tooling maturity, compiler support), they pave the way for faster, cleaner, and more maintainable C++ projects.  
