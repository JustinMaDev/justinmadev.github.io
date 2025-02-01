---
layout: post
title: "C++11 Feature Highlights: New Semantics"
---

This article is the second part of the C++11 New Features series, primarily documenting the new semantics introduced in C++11.

<!--more--> 

### 2. New Semantics

##### 2.1 Braces `{}` and Initialization

Before C++11, there were several ways to initialize variables:

1. **Default initialization**: `A a;` // Calls the default constructor  
2. **Value initialization**: `A a = 1;` // Calls the single-parameter constructor  
3. **Direct initialization**: `A a(1);` // Calls the single-parameter constructor  
4. **Copy initialization**: `A a2(a1);` or `A a2 = a1;` // Calls the copy constructor  

After C++11, **list initialization**, also known as **uniform initialization**, was introduced. The four initialization methods above can now be written in a unified form:

1. **Default initialization**: `A a{};`  
2. **Value initialization**: `A a = {1};` // Calls the single-parameter constructor  
3. **Direct initialization**: `A a{1};` // Calls the single-parameter constructor  
4. **Copy initialization**: `A a2{a1};` or `A a2 = a1;` // Calls the copy constructor  

However, it is important to note that **when initializing built-in types**, if the value inside the braces `{}` poses a risk of information loss, the compiler will generate an error:

```cpp
int a{1.5}; // Compilation fails: narrowing conversion is not allowed with brace initialization.
int b(1.5); // Compilation succeeds: implicit conversion truncates 1.5 to 1.
```
Besides being used for the initialization mentioned above, braces `{}` can also be used for return values (returning an initializer list) and container initialization (provided that the container has a constructor that takes `std::initializer_list` as a parameter).
~~~cpp
vector<string> strArr{"hello", "how", "are", "you"}
vector<string>  func(){
	return {"fine", "thanks"};
}
~~~
Absolutely amazing, right? 🚀  

In terms of initialization, aside from the powerful brace `{}` syntax, C++11 also introduced **delegating constructors**, allowing constructor code reuse:
```cpp
class Demo {
public:
    Demo(int _x, int _y) : a{_x}, b{_y} {}  // Braces `{}` can also be used in the class initialization list.
    Demo() : Demo(0, 0) {}                  // `Demo()` delegates its construction to `Demo(int, int)`.
    Demo(int _x) : Demo(_x, 0) {}           // `Demo(int)` delegates its construction to `Demo(int, int)`.
    
private:
    int a;
    int b;
};
```
Before C++11 introduced **delegating constructors**, if multiple constructors shared common initialization logic, the usual approach was to extract an `init` private function to handle it. With delegating constructors, the code is now more intuitive and elegant.

Another exciting feature is **in-class member initialization**. Before C++11, member variables could not be initialized within the class declaration—they had to be defined externally. With C++11, **in-class initialization** greatly simplifies specifying default values for member variables:

```cpp
class CC {
public:
    CC() {}
    ~CC() {}

private:
    int a{7};               // In-class initialization, available in C++11.
    const int b{8};         // In-class initialization, available in C++11.
    static int c{1};        // ❌ Not supported: `static` members cannot have in-class initializers.
    static const int d{4};  // ✅ Supported: `static const` members can have in-class initializers.
};

int CC::c{2};               // `c` still needs to be initialized outside the class, just like in C++98.
```
#### 2.2 Rvalue References

Rvalue references bring a lot of powerful features—such as **reference collapsing**, **universal references**, **move semantics (`std::move`)**, **perfect forwarding (`std::forward`)**, **move constructors**, and **move assignment operators**. With these features, **legacy C++ code can achieve significant performance improvements simply by upgrading the compiler version and the STL library, without modifying the existing code**.

The **reference collapsing rules** form the foundation of **universal references**, which in turn serve as the basis for STL functions like `std::move` and `std::forward`.  

For an introduction to **rvalue references**, `std::move`, and `std::forward`, refer to **[this blog post](https://blog.csdn.net/JohnnyMartin/article/details/83021105)**.  
For an explanation of **reference collapsing, universal references, and the implementation of `std::move` and `std::forward`**, see **[this blog post](https://blog.csdn.net/JohnnyMartin/article/details/83032499)**.  

This article will not repeat those topics.

#### 2.3 Lambda Expressions

Lambda expressions represent a callable code unit and can be thought of as an **anonymous inline function**. A particularly exciting feature is that **lambdas can be defined inside a function**—which is absolutely amazing, isn't it? 😃

A lambda expression has **a parameter list, a return type, and a function body**, making it very similar to a regular function. However, lambdas introduce an additional feature: **the capture list**.

~~~cpp
int func(){
int data{0};
auto myFuncA = [data](int a)->int{...};
auto myFuncB = []{...};  // Both the parameter list and the return type can be omitted.
}
~~~

The content inside the square brackets `[]` is the **capture list**.  
A lambda can only access local variables if they are explicitly listed in the capture list.  
For example, in `myFuncA`, the lambda can use `data` because it is captured, but in `myFuncB`, it cannot.  
However, **global variables can be freely accessed inside a lambda**.

### Capture List Variants:
- `[]` : **Empty capture list**, meaning the lambda cannot capture any local variables.
- `[a, b]` : **Captures `a` and `b` explicitly**, by value or reference depending on how they were declared.
- `[=]` : **Implicit capture by value**, capturing all local variables by value.
- `[&]` : **Implicit capture by reference**, capturing all local variables by reference.
- `[&, a, b...]` : **Captures `a, b...` by value, and the remaining local variables by reference**.
- `[=, a, b...]` : **Captures `a, b...` by reference, and the remaining local variables by value**.

The return type of a lambda expression can be **explicitly specified** or **inferred by the compiler**.  
For other functions, **return type deduction** is only supported starting from **C++14**.

#### 2.4 Trailing Return Type

In C and C++, the return type of a function is traditionally **placed before the function name**—this is known as **prefix return type** notation.  

However, when the return type is complex, function declarations can become difficult to read.  
For example, consider a function that returns a pointer to an array:
~~~cpp
int (*func(int param))[10]{
.....
}
~~~
This form of function declaration looks quite convoluted—one needs to analyze it carefully to distinguish the parameters and return type.  

In such cases, **trailing return type** provides a significant advantage:
~~~cpp
auto func(int param) -> int (*) [10]{
......
}
~~~
It is very similar to the way lambdas are defined—both place the return type after `->`.

#### 2.6 Range-Based `for` Loop

Many of C++11's new features make C++ code look quite different from before—**with `auto`, `T&&`, and now range-based `for` loops** appearing frequently.  

Before C++11, iterating over a regular array or a `vector` required the following approach:

~~~cpp
int arr[10] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
for (int i = 0; i < 10; i++)
	cout << arr[i];
std::vector<int> vec;
......
for (std::vector<int>::iterator itr = vec.begin(); itr != vec.end(); itr++)
	std::cout << *itr;
~~~
With range-based `for`, we can simplify the iteration as follows:
~~~cpp
int arr[10] = { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };
for (auto n : arr)
	std::cout << n;
std::vector<int> vec {1,2,3,4,5,6,7,8,9,10};
for (auto n :vec)
	std::cout << n;
~~~
This is absolutely amazing again!!! 🚀 It eliminates so much unnecessary code!!!  

However, when using range-based `for`, be **cautious with operations that invalidate iterators**—this issue existed in traditional `for` loops as well.

#### 2.7 `using` and `extern`

The `using` keyword has been around for a long time, with its most common usage being `"using namespace std;"`.  
In C++11, it has been given several additional functionalities:

### **Type Aliases**  
Since the C era, **`#define` and `typedef`** have been used to define aliases. However, both have readability issues—it's often unclear which is the new name and which is the existing name.  

With C++11's `using`, **the new name is placed on the left side of the `=` sign, and the existing name is on the right**, making it much clearer, more intuitive, and easier to read.  

Additionally, `using` can be used to create **template aliases**, which `typedef` cannot achieve.

~~~cpp
#define MyIntA int
typedef int MyIntB;
using MyIntC = int; //C++11
template<typename T>class TClass{ .......};

using TClass_Int = TClass<int>;
~~~

Another new feature of `using` is:  

### **Modifying the Visibility of Base Class Members**  
When `Drive` privately inherits from `Base`, the members `a` and `b` from `Base` become `private` in the derived class.  
However, with `using`, their visibility can be modified:

~~~cpp
class Base{
public: 
	int a;
protected:
	int b;
private:
	int c;
}
class Drive:private Base{
public:
	using Base::a;//OK
protected:
	using Base::b;//OK
	using Base::c;// Compilation error: Cannot access private members of the base class, 
                // therefore, visibility cannot be modified.
}
~~~
### **Inheriting Base Class Constructors**  
Another new functionality added to `using` in C++11 is **inheriting base class constructors**.  
A derived class can inherit all constructors from its **direct base class**:

---

### **`extern` Keyword Enhancements in C++11**  

The `extern` keyword has been around for a long time, with its common usages including:

- **Specifying external linkage**:  
  Used with global variables and functions to indicate that the symbol is defined elsewhere. The linker will resolve it during the linking stage.
  
- **Specifying C linkage (`extern "C"`)**:  
  This tells the compiler not to apply C++ name mangling for the enclosed functions, ensuring compatibility with C.

- **Explicit template instantiation declaration (`// C++11`)**:  
  In C++11, `extern` gained a **new feature**—explicit template instantiation declaration.

### **Explicit Template Instantiation Declaration (`extern template`)**
C++ templates are instantiated **only when used**, meaning the same template might be instantiated **multiple times across different modules**.  
This can lead to **code bloat** and **slower compilation times**.  

With **explicit template instantiation declaration**, we can instruct the compiler **not** to instantiate the template in the current module. Instead, it will rely on an instantiation from another module.  
If no module provides an instantiation, the linker will generate an error.

This feature significantly improves the compilation efficiency of **large-scale template projects**.

---

### **2.8 Variadic Templates and `sizeof...`**
Variadic templates are a **game-changer** for standard library developers, greatly enhancing the flexibility of template programming.  
Let's first look at how this amazing feature is used:
~~~cpp
#include <iostream>
#include <string>
template<typename... Ts>
int countArgs(const Ts&... args){
    return sizeof...(args);   
}
template<typename T>
T max(const T& a,const T& b){
    return b > a ? b : a;
}
template<typename T, typename... RestT>
T max(const T& a, const RestT&... restArgs){
    T temp = max(restArgs...);
    return temp > a ? temp : a;
}       
template<typename T>
void func(const T& t){
    std::cout<<t;
}
template<typename T, typename... RestT>
void func(const T& t, const RestT&... restArgs){
    std::cout<<t<<std::endl;
    func(restArgs...);
}
int main(){
    func(1, 'a', "hahah");
    std::cout<<std::endl;
    std::cout<<max(1,5,3,2,8,6,9,7,3)<<std::endl;
    std::cout<<countArgs(1,"g", 0.0009);
}
~~~