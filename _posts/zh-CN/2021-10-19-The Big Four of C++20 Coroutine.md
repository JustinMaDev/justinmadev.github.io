---
layout: post
title: C++20四大之二：coroutines特性详解
lang: zh-CN
---


上一篇博客中我们介绍了C++20中module相关的特性，本篇博客我们通过三个可运行的完整示例来体验下C++20中的协程：coroutine。
全文共三部分，第一部分从概念上讨论协程与普通函数的区别；第二部分通过两个个完整的协程代码示例，并深入到编译器层面，深入解析promise_type及其工作流程；第三部分介绍了co_await的作用以及工作原理，该部分是本文最难理解的部分。


![](/assets/images/20211019_1.png)
<!--more--> 

### 什么是C++的协程？
1. 从语法角度讲，函数代码中含有co_await、co_yield、co_return中任何一个关键字，这个函数就是一个协程。

2. 从系统角度讲，协程是运行在**线程**中的一堆代码，这些代码的执行过程可以被中断、恢复，从而实现**单线程下的异步**。这点是协程异步跟多线程异步的根本区别。
在多线程异步的设计中，代码挂起意味着运行堆栈的保存与cpu等硬件资源的调度。保存与调度由系统负责，一个线程有且只有一个运行堆栈，线程恢复时，从上次挂起的地方继续执行。
在协程中，代码的“挂起”与硬件资源的调度不再挂钩：我们挂起一段协程，线程继续运行，CPU等硬件资源不会被剥夺。

3. 从执行流程的角度讲，调用一个普通函数，只有两个状态：
    调用(invoke) => 终止(finalize)。
    调用一个协程，有四种状态：
    调用(invoke) => 挂起(suspends) <=> 恢复(resume) => 终止(finalize)。
    
在非协程的情况下，同一线程下，调用一个函数，一定是从函数第一行开始执行，执行流程要想返回到它的调用者，也只有一个方式：return（不考虑异常），函数return之后，假如再次调用函数，依然一定是从函数的第一行开始执行。
协程的情况下，调用一个协程函数，这个协程函数可能挂起多次、恢复多次，协程可以通过co_yeild挂起且向调用者返回一个值，下次调用从上次返回的语句下方继续执行。。。

挂起协程时需要保存代码的调用状态、内部变量的值等，**保存在哪里**呢？
**谁来保存？谁来恢复？**
一个协程可能返回多次值给caller，这些“**返回值**”**如何传递**？（非协程代码通过return机制，比如放到eax寄存器中）

带着上面灵魂三问，我们正式进入C++20的coroutines的世界。
### 协程帧、promise_type 、future_type 与 coroutine_handle

首先**牢记两个前提**：
C++20 的协程没有协程调度器，协程的挂起、恢复，由编译器**安插代码**完成。
C++20提供了协程机制，而不是提供协程库，Library Write可以使用协程机制实现自己的协程库。

先看下与协程相关的三个关键字：co_await、co_yield与co_return
>* co_yield some_value: 保存当前协程的执行状态并挂起，返回some_value给调用者
>* co_await some_awaitable: 如果some_awaitable没有ready，就保存当前协程的执行状态并挂起
>* co_return some_value: **彻底结束**当前协程，返回some_value给协程调用者

我们先根据C++20标准来实现一个最简单的、可运行的、没有返回值的协程（运行环境：https://godbolt.org/ 编译器版本选择”x86-64 gcc (coroutines)“）
~~~cpp
#include<iostream>
#include<coroutine>
struct future_type{
    struct promise_type;
    using co_handle_type = std::coroutine_handle<promise_type>;

    struct promise_type{
        promise_type(){
            std::cout<<"promise_type constructor"<<std::endl;
        }
        ~promise_type(){
            std::cout<<"promise_type destructor"<<std::endl;
        }
        auto get_return_object(){
            std::cout<<"get_return_object"<<std::endl;
            return co_handle_type::from_promise(*this);
        }
        auto initial_suspend(){
            std::cout<<"initial_suspend"<<std::endl;
            return std::suspend_always();
        }
        auto final_suspend() noexcept(true) {
            std::cout<<"final_suspend"<<std::endl;
            return std::suspend_always();
        }
        void return_void(){
            std::cout<<"return_void"<<std::endl;
        }
        void unhandled_exception(){
            std::cout<<"unhandled_exception"<<std::endl;
            std::terminate();
        }
    };
    
    future_type(co_handle_type co_handle){
        std::cout<<"future_type constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type(){
        std::cout<<"future_type destructor"<<std::endl;
        co_handle_.destroy();
    }
    future_type(const future_type&) = delete;
    future_type(future_type&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }
private:
    co_handle_type co_handle_;
};

future_type three_step_coroutine(){
    std::cout<<"three_step_coroutine begin"<<std::endl;
    co_await std::suspend_always();
    std::cout<<"three_step_coroutine running"<<std::endl;
    co_await std::suspend_always();
    std::cout<<"three_step_coroutine end"<<std::endl;
}
int main(){
    future_type ret = three_step_coroutine(); 
    std::cout<<"=======calling first resume======"<<std::endl;
    ret.resume();
    std::cout<<"=======calling second resume====="<<std::endl;
    ret.resume();
    std::cout<<"=======calling third resume======"<<std::endl;
    ret.resume();
    std::cout<<"=======main end======"<<std::endl;

    return 0;
}
~~~

输出为：

```cpp
promise_type constructor
get_return_object
initial_suspend
future_type constructor
=======calling first resume======
three_step_coroutine begin
=======calling second resume=====
three_step_coroutine running
=======calling third resume======
three_step_coroutine end
return_void
final_suspend
=======main end======
future_type destructor
promise_type destructor
```
我们先忽略future_type与promise_type这两个莫名其妙的结构体，直接从main函数开始看起，第一行代码就与非协程时代的代码完全不同。
以非协程时代的认知来看：
>* three_step_cocoutine是一个函数。（因为它有着一个（），有返回值，有大括号。。。）
>* ret是three_step_cocoutine的一个返回值，它的类型是future_type。
>* 第一行执行结束后，ret被返回，意味着three_step_cocoutine已经执行完了。

在协程时代，上面三条完全被**推翻了**，一条都不剩！
>* three_step_cocoutine不是一个函数，它是一个协程！（因为它的body中含有co_await）
>* ret并不是three_step_cocoutine的返回值，它是协程对象的管理者，或者说，**ret是协程本身**，协程的返回值在ret内部存储
>* 第一行结束后，three_step_cocoutine 的body中一行代码都没有被执行！

先抛开future_type与promise_type内部细节，main函数开始后，执行顺序如下：

 1. 编译器安插的代码负责调用new操作符分配一个**协程帧(coroutine frame)**，将参数拷贝到帧中。（promise_type可以重写new操作符，若无重写，此处调用全局new操作符。重写了new一般也要重写delete）
 2. 编译器安插的代码负责构造promise_type的对象
 3. 获取return_object对象用来存储协程产生的“返回值“，return_object会在协程第一次挂起后被用到
 4. 调用promise对象的initial_suspend方法，该方法将three_step_cocoutine协程挂起，执行权即将返回给main函数
 5. 构造future_type对象，并将该对象返回给ret，执行权回到main函数。
 6. main函数执行第一个resume，resume通过future_type对象中保存的协程句柄co_handle_,将协程恢复执行，执行权从main函数交给three_step_cocoutine协程。
 7. three_step_cocoutine协程执行第一个cout，然后遇到co_await挂起自己，执行权返回给main函数
 8. main函数执行第二个resume，从略。
 9. main函数执行，第三个resume，协程打印出第三个cout，然后调用return_void保存协程返回值到return_object对象中（该对象实际是promise对象）
 10. 调用promise对象中的final_suspend函数，协程再次挂起，执行流程再次回到main函数。
 11. main函数结束，future对象、promise对象被依次销毁，程序结束。

通过分析上面的代码以及代码的执行流程，我们得出以下几点结论：
>* main函数不能是协程，也就是main函数中不能出现co_await、co_return、co_yield等关键字（构造函数也不能是协程）
>* 非协程代码（main函数中的代码）可以调用协程代码
>* 非协程代码，通过协程句柄co_handle可以控制协程的执行。本例中，非协程代码通过调用future对象暴露的reume方法，通过co_handle，控制协程resume。
>* 协程第一次执行前，编译器安插的代码会负责创建promise对象，并调用promise对象的get_return_type方法，获得return_object。
>* 然后调用initial_suspend方法，该方法的作用控制协程初始化完毕后的行为：初始化完毕后是挂起协程还是正式开始执行协程body代码
>* 协程第一次挂起后，创建future对象，并将对象返回给调用者，执行权交回到调用者。
>* 协程body最后一行代码执行完毕后，会调用return_void或者return_value保存返回值，然后继续调用promise的final_suspend方法，假如该方法挂起了协程，则执行权直接回到调用者；假如该方法没有挂起协程，执行完final_suspend内的代码后，此协程彻底执行完毕，promise对象被销毁，执行权再回到调用者。

通过上面的几点结论，我们又能得出进一步的总结：
>* future_type、promise_type、coroutine_handle是协程机制的主要手段
>* promise_type是future_type内的类型
>* 程序员对协程的设计（一个协程返回什么类型的值、协程初始化完毕后是挂起还是继续执行、协程出异常了如何处理等等），通过promise_type传递给编译器，编译器负责实例化出promise对象
>* 编译器将协程的句柄(coroutine_handle)装填到future对象中，从而将协程的控制权暴露给调用者。

以下便是编译器实际安插的代码的大致样子，< body >便是我们的three_step_coroutine里面的代码
~~~cpp
{
  co_await promise.initial_suspend();
  try{
    <body>
  }catch (...){
    promise.unhandled_exception();
  }
  co_await promise.final_suspend();
}
~~~
从上面的代码可以看出，协程body代码在被执行到之前，会先执行initial_suspend方法，出异常后，执行unhandled_exception方法，执行完毕后，执行final_suspend方法。promise_type还有多个接口没在上面代码中反映出来。

我们看下promise_type的接口全貌：

| promise_type接口 | 作用 | |
|--|--|--|
|  initial_suspend()|  用于定制协程body开始执行的时机|是 |
|  final_suspend()|  用于定制协程body执行完毕后的行为|是 |
|  get_return_object()|  用于用于获取容纳协程返回值的holder|是 |
|unhandled_exception()|用于定制协程body执行过程中出异常后的处理方式|是|
|return_value(T)、return_void() |用于定制协程body中co_return xxx;语句的行为|否|
|yield_value()|用于定制协程body中co_yield xxx;语句的行为|否|
|await_transform()|用于定制协程body中co_await xxx;语句的行为。定义该方法后，编译器会将出现在协程主体中的每个co_await  xxx;转换为co_await promise.await_transform(xxx)|否|

coroutine_handle也暴露出多个接口，用于控制协程的行为、获取协程的状态，与promise_type不同的是，promise_type里的接口需要我们填写实现，promise_type里的接口是给编译器调用的。coroutine_handle的接口不需要我们填写实现，我们可以直接调用。
| coroutine_handle接口 |  作用|
|--|--|
| from_promise() |  从promise对象创建一个coroutine_handle|
| done()| 检查协程是否运行完毕|
|operator bool |检查当前句柄是否是一个coroutie |
|operator() | 恢复协程的执行|
| resume|恢复协程的执行（同上） |
|destroy |销毁协程 |
|promise | 获取协程的promise对象|
| address|返回coroutine_handle的指针 |
|from_address |从指针导入一个coroutine_handle |

有了上面的清单，我们就可以尝试实现一个返回int值的协程了：（运行环境：https://godbolt.org/ 编译器版本选择”x86-64 gcc (coroutines)“）
~~~cpp
#include<iostream>
#include<coroutine>
using namespace std;

struct future_type_int{
    struct promise_type;
    using co_handle_type = std::coroutine_handle<promise_type>;
    
    struct promise_type{
        int ret_val;
        promise_type(){
            std::cout<<"promise_type constructor"<<std::endl;
        }
        ~promise_type(){
            std::cout<<"promise_type destructor"<<std::endl;
        }
        auto get_return_object(){
            std::cout<<"get_return_object"<<std::endl;
            return co_handle_type::from_promise(*this);
        }
        auto initial_suspend(){
            std::cout<<"initial_suspend"<<std::endl;
            return std::suspend_always();
        }
        auto final_suspend() noexcept(true) {
            std::cout<<"final_suspend"<<std::endl;
            return std::suspend_never();
        }
        void return_value(int val){
            std::cout<<"return_value : "<<val<<std::endl;
            ret_val = val;
        }
        void unhandled_exception(){
            std::cout<<"unhandled_exception"<<std::endl;
            std::terminate();
        }
        auto yield_value(int val){
            std::cout<<"yield_value : "<<val<<std::endl;
            ret_val = val;
            return std::suspend_always();
        }
    };
    future_type_int(co_handle_type co_handle){
        std::cout<<"future_type_int constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_int(){
        std::cout<<"future_type_int destructor"<<std::endl;
        co_handle_.destroy();
    }
    future_type_int(const future_type_int&) = delete;
    future_type_int(future_type_int&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }
    co_handle_type co_handle_;
};

future_type_int three_step_coroutine(){
    std::cout<<"three_step_coroutine begin"<<std::endl;
    co_yield 222;
    std::cout<<"three_step_coroutine running"<<std::endl;
    co_yield 333;
    std::cout<<"three_step_coroutine end"<<std::endl;
    co_return 444;
}
int main(){
    future_type_int future_obj = three_step_coroutine(); 
    
    std::cout<<"=======calling first resume======"<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    
    std::cout<<"=======calling second resume====="<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    
    std::cout<<"=======calling third resume======"<<std::endl;
    future_obj.resume();
    std::cout<<"ret_val = "<<future_obj.co_handle_.promise().ret_val<<std::endl;
    std::cout<<"=======main end======"<<std::endl;

    return 0;
}
~~~
**值得注意的**是，promise_type是C++20标准指定的类型名，但future_type不是——你可以把它写成任意的名称——比如future_type_int，只要它内部有一个promise_type即可编译通过。

输出为：
~~~cpp
promise_type constructor
get_return_object
initial_suspend
future_type constructor
=======calling first resume======
three_step_coroutine begin
yield_value : 222
ret_val = 222
=======calling second resume=====
three_step_coroutine running
yield_value : 333
ret_val = 333
=======calling third resume======
three_step_coroutine end
return_value : 444
final_suspend
promise_type destructor
ret_val = 444
=======main end======
future_type destructor
~~~
至此，我们便可以回答上文提到的"灵魂三问"了
>* 协程挂起时的调用栈等信息，保存在协程帧中
>* 由编译器负责安插代码，进行协程帧的创建、销毁，同时负责调用栈的保存、恢复
>* 返回值由编译器传给promise对象，保存到promise对象的成员中。调用者通过coroutin_handle即可拿到promise对象，进而拿到返回值

通过上一个代码示例，我们已经能够设计协程、返回想要的值了，简单来说就是：
promise_type实现yield_value、return_value,协程body代码便可以通过co_yield、co_return返回值给调用者。

那 co_await有什么用？在返回int值的协程示例中，我们从头到尾都没用到过co_await关键字。
co_await存在的意义在哪？
在第上上个示例代码中（无返回值的协程代码），three_step_coroutine 的body中有这样一行代码：
co_await std::suspend_always(); 为何调用了这行代码协程就挂起了？
返回int值的协程示例中，我们获取返回值的方式非常不优雅，如何改进？

co_await将回答上面所有的疑问。
### co_await 与 Awaitable 、 Awaiter  
co_await是一个一元操作符，对于代码：
~~~cpp
co_await xxx;
~~~
co_await是操作符，xxx是它的操作数。只有xxx是Awaitable的类型才能做co_await的操作数，std::suspend_always()就是一个Awaitable的类型。

一个类型怎样才能成为Awaitable？
>* 当前协程的promise对象中实现了await_transform方法，则当前协程body中出现的co_await aaa；co_await bbb; 中的aaa、bbb都是Awaitable的！co_await xxx;会被处理成 co_await promise.await_transform(xxx)。
>* xxx对应的future_type实现了await_ready、await_suspend、await_resume三个方法，这是最常见的实现Awaitable的途径，std::suspend_always()就属于这种情况。

只有xxx是Awaitable的，co_await xxx;这样的代码在语法层面才是合法的，我们可以看出，xxx是Awaitable不光取决于xxx，也取决于调用co_await xxx；的调用者的promise_type的实现。（实际上，编译器会先看调用者的promise_type的实现，假如调用者的promise_type没有实现await_transform，才会看xxx是否实现了await_ready、await_suspend、await_resume三接口）

实现了await_ready、await_suspend、await_resume三个接口的类，称作是 Awaiter 类型。
**Awaiter类型一定是Awaitable的**
非Awaiter类型**有可能**是Awaitable的。

Awaiter三个接口分别是做啥用的呢？我们先看下编译器是如何处理 “co_await  xxx;”这种代码的：(忽略异常处理)
~~~cpp
{
	auto a = get_awaiter_object_of_xxx();
	if(!a.await_ready()) {
		<suspend_current_coroutine>
	#if(a.await_suspend returns void)
		a.await_suspend(coroutine_handle);
		return_to_the_caller_of_current_coroutine();
	#elseif(a.await_suspend returns bool)
		bool await_suspend_result = a.await_suspend(coroutine_handle);
		if (await_suspend_result)
			return_to_the_caller_of_current_coroutine();
		else
			goto <resume_current_cocourine>;//这行goto是多余的，意在强调await_suspend_result == false时的执行流程。
	#elseif(a.await_suspend returns another coroutine_handle)
	    auto another_coro_handle = a.await_suspend(coroutine_handle);
		another_coro_handle.resume();
		//资料上显示，执行another_coro_handle.resume(); 后依然能将执行权返回给当前协程的caller，此处笔者怀疑不能。
		//资料出处：https://blog.panicsoftware.com/co_awaiting-coroutines/ 
		return_to_the_caller_of_current_coroutine();//故本行代码是否应该存在请保持疑问。
	#endif
		<resume_current_cocourine>
	}
	return a.await_resume();
}
~~~
类似于promise_type，程序员可以根据不同场景，实现await_ready等接口，**用以定义co_await的行为**。设想一个实际场景场景会更好理解：xxx是一个协程，我们是这个协程的作者，我们想定制别人co_await xxx时的行为，于是我们在xxx协程的future_type中实现了awaitable三接口。当编译器遇到 co_await xxx;时，编译器会做如下处理：

>* 拿到xxx的future对象，通过future对象，获取到到awaiter对象，获取的具体手法(也就是get_awaiter_object_of_xxx函数)此处从略，只要future_type实现了awaitable的三个接口，此处就能成功获取到awaiter对象。
>* 调用await_ready接口，假如caller协程等待(await)的东西我们的xxx协程已经准备好了，或者caller想等待的东西不耗时，我们的xxx协程可以同步返回，我们就通过本接口返回一个true值，编译器拿到这个true之后，就知道**没必要挂起当前(caller)协程**(挂起一个协程的消耗虽然远小于挂起一个线程，但是也是有消耗的)，于是就调用await_resume，返回await_resume的返回值。await_ready() 方法存在的目的是在已知操作将同步完成而无需挂起的情况下，免除 suspend_current_coroutine操作的成本。
**绝大多数情况下，await_resume接口返回的都是false。**（像std::suspend_always()）
>* 假如当前协程等待的东西，xxx协程尚未准备好，那编译器就产生一段代码，将**当前协程挂起**，准备将控制权交给xxx协程，等待xxx执行，以便将caller想要的东西准备好。
>* 挂起当前协程后，调用a.await_suspend,并将**当前协程的句柄**传入。此时，a.await_suspend内部就可以恢复xxx协程的执行了。await_suspend函数体执行完毕后返回一个值，这个值有四种情况：
>>* await_suspend返回void：协程执行权交还给**当前协程的caller**。（也就是xxx的caller的caller），当前协程在未来某个时机被resume之后，代码从<resume_current_cocourine>开始执行，最终从await_resume拿到返回值。
>>* await_suspend返回true：同返回void。
>>* await_suspend返回false：通过执行<resume_current_cocourine> 恢复当前协程，然后执行await_resume，将产生的返回值返回给当前协程，执行权继续在当前协程。
>>* await_suspend返回一个协程句柄：调用该协程句柄的resume方法，恢复对应协程的运行。resume有可能链式反应，最终导致当前协程被resume，甚至这个协程句柄有可能恰好直接是当前协程的句柄，则当前协程直接被resume。
>* 在调用await_suspend之前，当前协程已经被完整的挂起了，所以当前协程的句柄可以在**其他线程**恢复，本文暂不讨论这种复杂场景。

简单来说，对于co_await xxx; 是这样的：
>* xxx实现的await_ready告诉xxx的调用者，是否需要挂起调用者协程。
>* xxx实现的await_resume，负责将xxx执行过程中产生的值返回给xxx的调用者。
>* xxx实现的await_suspend，负责决定xxx执行完毕后（有可能是中途挂起）执行权的归属。

有点绕，有木有？
通过一个完整的实例就比较清晰了：
~~~cpp
#include<iostream>
#include<coroutine>
using namespace std;

struct future_type_int{
    struct promise_type{
    int ret_val;
    using co_handle_type = std::coroutine_handle<promise_type>;
    promise_type(){
        std::cout<<"promise_type constructor"<<std::endl;
    }
    ~promise_type(){
        std::cout<<"promise_type destructor"<<std::endl;
    }
    auto get_return_object(){
    	std::cout<<"get_return_object"<<std::endl;
        return co_handle_type::from_promise(*this);
    }
    auto initial_suspend(){
    	std::cout<<"initial_suspend"<<std::endl;
        return std::suspend_always();
    }
    auto final_suspend() noexcept(true) {
    	std::cout<<"final_suspend"<<std::endl;
        return std::suspend_never();
    }
    void return_value(int val){
    	std::cout<<"return_value : "<<val<<std::endl;
        ret_val = val;
	}
    void unhandled_exception(){
    	std::cout<<"unhandled_exception"<<std::endl;
        std::terminate();
    }
    auto yield_value(int val){
        std::cout<<"yield_value : "<<val<<std::endl;
        ret_val = val;
        return std::suspend_always();
    }
};
    using co_handle_type = std::coroutine_handle<promise_type>;
    future_type_int(co_handle_type co_handle){
        std::cout<<"future_type_int constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_int(){
        std::cout<<"future_type_int destructor"<<std::endl;
    }
    future_type_int(const future_type_int&) = delete;
    future_type_int(future_type_int&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }
    bool await_ready() { 
        return false; 
    }
    bool await_suspend(std::coroutine_handle<> handle) {
        resume();
        return false;
    }
    auto await_resume() {
        return co_handle_.promise().ret_val;
    }

    co_handle_type co_handle_;
};

future_type_int three_step_coroutine(){
    std::cout<<"three_step_coroutine begin"<<std::endl;
    co_yield 222;
    std::cout<<"three_step_coroutine running"<<std::endl;
    co_yield 333;
    std::cout<<"three_step_coroutine end"<<std::endl;
    co_return 444;
}

struct future_type_void{
	struct promise_type;
	using co_handle_type = std::coroutine_handle<promise_type>;
	struct promise_type{
	    promise_type(){
	        std::cout<<"promise_type constructor void"<<std::endl;
	    }
	    ~promise_type(){
	        std::cout<<"promise_type destructor void"<<std::endl;
	    }
	    auto get_return_object(){
	    	std::cout<<"get_return_object void"<<std::endl;
	        return co_handle_type::from_promise(*this);
	    }
	    auto initial_suspend(){
	    	std::cout<<"initial_suspend void"<<std::endl;
	        return std::suspend_always();
	    }
	    auto final_suspend() noexcept(true) {
	    	std::cout<<"final_suspend void"<<std::endl;
	        return std::suspend_never();
	    }
	    void unhandled_exception(){
	    	std::cout<<"unhandled_exception void"<<std::endl;
	        std::terminate();
	    }
	    void return_void(){
	    	std::cout<<"return_void void: "<<std::endl;
		}
	};

    future_type_void(co_handle_type co_handle){
        std::cout<<"future_type_void constructor"<<std::endl;
        co_handle_ = co_handle;
    }
    ~future_type_void(){
        std::cout<<"future_type_void destructor"<<std::endl;
        co_handle_.destroy();
    }
    future_type_void(const future_type_void&) = delete;
    future_type_void(future_type_void&&) = delete;

    bool resume(){
        if(!co_handle_.done()){
            co_handle_.resume();
        }
        return !co_handle_.done();
    }

    co_handle_type co_handle_;
};
future_type_void call_coroutine(){
    auto future = three_step_coroutine();
    std::cout<<"++++++++call three_step_coroutine first++++++++"<<std::endl;
    auto val = co_await future;
    std::cout<<"++++++++call three_step_coroutine second++++++++, val: "<<val<<std::endl;
    val = co_await future; 
    std::cout<<"++++++++call three_step_coroutine third++++++++, val: "<<val<<std::endl;
    val = co_await future; 
    std::cout<<"++++++++call three_step_coroutine end++++++++, val: "<<val<<std::endl;
    co_return;
}
int main(){
    auto ret = call_coroutine();
    std::cout<<"++++++++begine call_coroutine resume in main++++++++"<<std::endl;
    ret.resume();
    std::cout<<"++++++++end call_coroutine resume in main++++++++"<<std::endl;
    return 0;
}
~~~
输出：
~~~cpp
promise_type constructor void
get_return_object void
initial_suspend void
future_type_void constructor
++++++++begine call_coroutine resume in main++++++++
promise_type constructor
get_return_object
initial_suspend
future_type_int constructor
++++++++call three_step_coroutine first++++++++
three_step_coroutine begin
yield_value : 222
++++++++call three_step_coroutine second++++++++, val: 222
three_step_coroutine running
yield_value : 333
++++++++call three_step_coroutine third++++++++, val: 333
three_step_coroutine end
return_value : 444
final_suspend
promise_type destructor
++++++++call three_step_coroutine end++++++++, val: 444
return_void void: 
future_type_int destructor
final_suspend void
promise_type destructor void
++++++++end call_coroutine resume in main++++++++
future_type_void destructor
~~~
我们可以看到，每co_await future;一次，就会返回一个three_step_coroutine的一个co_yield的值，我们在future_type_int中实现的await_suspend方法返回了一个false，保证了co_await future;之后代码的执行权回回到call_coroutine协程而不是main函数。大家可以尝试下更改await_suspend的返回值，有助于理解这个返回值对co_await的行为的影响。

到这里，大家也应该能够理解为何co_await std::suspend_always()能够挂起当前协程了，因为suspend_always的实现是这样的：
~~~cpp
constexpr bool await_ready() const noexcept { return false; }
constexpr void await_suspend(std::coroutine_handle<>) const noexcept {}
constexpr void await_resume() const noexcept {}
~~~
await_ready返回false确保当前协程会被挂起，await_suspend返回void确保当前协程挂起后，执行权回到当前协程的caller。仅此而已。

个人感觉，协程存在的问题：
1，co_await语义不统一（有可能是invoke&await语义，也有可能是invoke&suspend语义），随着协程库的实现而改变，代码阅读障碍。

至此，C++20中协程的内容告一段落，在学习C++协程的时候，很多概念需要去仔细琢磨，比如Awaiter与Awaitable的关系，搜索资料研究编译器为协程安插的代码有助于我们对这些概念的理解。水平有限，文章如有疏漏之处，欢迎大家联系讨论。

参考文献：
https://blog.panicsoftware.com/co_awaiting-coroutines
https://en.cppreference.com/w/cpp/language/coroutines
https://lewissbaker.github.io/2018/09/05/understanding-the-promise-type
https://lewissbaker.github.io/2017/11/17/understanding-operator-co-await


